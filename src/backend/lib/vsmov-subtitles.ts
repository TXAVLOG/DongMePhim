/**
 * Utility to fetch VSMOV episodes (m3u8 + subtitles) from embed pages.
 * Used during crawling to pre-fetch streams & subtitles so they're stored in DB.
 *
 * VSMOV API: https://vsmov.com/api/phim/{slug}
 *   → episodes[].server_data[].link_embed = "https://v9.streamvsmov.com/video/{uuid}"
 *   → embed page HTML contains playerOptions with `file` (m3u8) and `subtitles` array
 */

interface SubtitleEntry {
  label: string;
  file: string;
  default: boolean;
}

interface EmbedData {
  m3u8Url: string;
  subtitles: SubtitleEntry[];
}

/**
 * Cleans VSMOV server names which often contain "\r\n" and extra whitespace.
 */
function cleanServerName(name: string): string {
  return (name || '').replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes episode names: "1" → "Tập 1", "Tập 01" → "Tập 1", etc.
 */
function normalizeEpName(name: string): string {
  const n = (name || '').trim();
  // Pure number → prefix with "Tập"
  if (/^\d+$/.test(n)) return `Tập ${parseInt(n, 10)}`;
  // "Tập 01" → "Tập 1"
  return n.replace(/^Tập\s+0*(\d+)$/i, (_, d) => `Tập ${parseInt(d, 10)}`);
}

/**
 * Fetches embed data (m3u8 + subtitles) from a VSMOV stream embed page.
 * e.g. https://v9.streamvsmov.com/video/{uuid}
 */
export async function fetchEmbedData(embedUrl: string): Promise<EmbedData> {
  if (!embedUrl) return { m3u8Url: '', subtitles: [] };

  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://vsmov.com/'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      console.log(`[VSMOV-Sub] Embed fetch failed (HTTP ${res.status}) for: ${embedUrl}`);
      return { m3u8Url: '', subtitles: [] };
    }

    const html = await res.text();
    const parsedUrl = new URL(embedUrl);
    const origin = parsedUrl.origin;
    const uuid = parsedUrl.pathname.split('/video/')[1]?.split('/')[0] || '';

    // --- Extract m3u8 stream URL ---
    let m3u8Url = '';

    // Try direct stream URL pattern first
    if (uuid) {
      m3u8Url = `${origin}/stream/${uuid}/master.m3u8`;
    }

    // Also try to find `file:` in playerOptions JSON
    const fileMatch = html.match(/["']file["']\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/i);
    if (fileMatch) {
      m3u8Url = fileMatch[1];
    }

    // --- Extract subtitles from playerOptions ---
    const subtitles: SubtitleEntry[] = [];

    // Strategy 1: Match subtitles: [...] block
    const subtitlesMatch = html.match(/subtitles\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
    let rawSubs: any[] = [];

    if (subtitlesMatch) {
      try {
        rawSubs = JSON.parse(subtitlesMatch[1]);
      } catch (_) {
        // Fallback: extract individual subtitle objects
        const itemRegex = /\{"name":"(.*?)","type":"(.*?)","url":"(.*?)","code":"(.*?)"\}/g;
        let match;
        while ((match = itemRegex.exec(subtitlesMatch[1])) !== null) {
          rawSubs.push({ name: match[1], type: match[2], url: match[3], code: match[4] });
        }
      }
    }

    // Strategy 2: Look for subtitle URL pattern directly if no subtitles block
    if (rawSubs.length === 0) {
      const subUrlRegex = /(https?:\/\/[^\s"']+\/(subtitle|sub)\/[^\s"']+\.(vtt|srt))/gi;
      let m: RegExpExecArray | null;
      while ((m = subUrlRegex.exec(html)) !== null) {
        rawSubs.push({ name: 'Phụ đề', type: 'vtt', url: m[1], code: 'vie' });
      }
    }

    for (const sub of rawSubs) {
      let label = sub.name || sub.code || 'Phụ đề';
      if (sub.code === 'vie' || label.toLowerCase().startsWith('vie')) {
        label = 'Tiếng Việt';
      } else if (sub.code === 'eng' || label.toLowerCase().startsWith('eng')) {
        label = 'English';
      }

      let subUrl = sub.url || '';
      if (subUrl.startsWith('/')) subUrl = `${origin}${subUrl}`;
      if (!subUrl) continue;

      const proxyUrl = `/api/proxy-subtitle?url=${encodeURIComponent(subUrl)}`;
      subtitles.push({ label, file: proxyUrl, default: sub.code === 'vie' });
    }

    if (m3u8Url || subtitles.length > 0) {
      console.log(`[VSMOV-Sub] embed ${embedUrl} → m3u8=${m3u8Url ? '✅' : '❌'} subs=${subtitles.length}`);
    }

    return { m3u8Url, subtitles };
  } catch (err: any) {
    console.error(`[VSMOV-Sub] Error fetching embed: ${embedUrl}`, err.message || err);
    return { m3u8Url: '', subtitles: [] };
  }
}

/** @deprecated Use fetchEmbedData instead */
export async function fetchSubtitlesFromVsmovEmbed(embedUrl: string): Promise<SubtitleEntry[]> {
  const { subtitles } = await fetchEmbedData(embedUrl);
  return subtitles;
}

/**
 * Calls VSMOV API to get the movie's episode list, then for each episode
 * fetches embed page to extract m3u8 + subtitles.
 *
 * Merges the results back into the existing episodes array by matching
 * episode names. If the existing episodes don't have a VSMOV embed URL,
 * the resolved embed URL from VSMOV API is used directly.
 *
 * Supports multiple servers from VSMOV (Vietsub #1, Thuyet Minh #1, etc.)
 */
export async function enrichVsmovEpisodesWithSubtitles(
  episodes: any[],
  movieSlug: string
): Promise<{ episodes: any[]; subtitleLog: string[] }> {
  const subtitleLog: string[] = [];

  if (!movieSlug) return { episodes, subtitleLog };

  // --- Step 1: Fetch VSMOV API to get server list with embed URLs ---
  let vsmovServers: { serverName: string; serverData: { name: string; slug: string; link_embed: string }[] }[] = [];
  try {
    const apiUrl = `https://vsmov.com/api/phim/${movieSlug}`;
    const apiRes = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://vsmov.com/' },
      signal: AbortSignal.timeout(15000)
    });
    if (apiRes.ok) {
      const apiJson = await apiRes.json() as any;
      if (apiJson.status && Array.isArray(apiJson.episodes)) {
        vsmovServers = apiJson.episodes.map((srv: any) => ({
          serverName: cleanServerName(srv.server_name || srv.serverName || ''),
          serverData: (srv.server_data || srv.serverData || []).map((ep: any) => ({
            name: normalizeEpName(ep.name || ''),
            slug: ep.slug || '',
            link_embed: ep.link_embed || ep.linkEmbed || ''
          }))
        }));
        subtitleLog.push(`[VSMOV-API] Found ${vsmovServers.length} server(s) from API`);
      }
    } else {
      subtitleLog.push(`[VSMOV-API] API fetch failed HTTP ${apiRes.status}`);
    }
  } catch (err: any) {
    subtitleLog.push(`[VSMOV-API] API fetch error: ${err.message}`);
  }

  if (vsmovServers.length === 0) {
    subtitleLog.push(`[VSMOV-API] No servers from API, falling back to embed links in existing episodes`);
  }

  // --- Step 2: Build a lookup map of embed data (fetched lazily per embed URL) ---
  const embedCache = new Map<string, EmbedData>();

  async function getEmbedData(embedUrl: string): Promise<EmbedData> {
    if (!embedUrl) return { m3u8Url: '', subtitles: [] };
    if (embedCache.has(embedUrl)) return embedCache.get(embedUrl)!;
    const data = await fetchEmbedData(embedUrl);
    embedCache.set(embedUrl, data);
    return data;
  }

  // --- Step 3: Process existing episodes array ---
  // For each server in the existing episodes, try to find matching VSMOV server data
  const processedEpisodes = Array.isArray(episodes) ? [...episodes] : [];

  // Determine if existing episodes is empty — if so, build from VSMOV servers directly
  const existingEpCount = processedEpisodes.reduce((sum, srv) => {
    const data = srv.serverData || srv.server_data || [];
    return sum + data.length;
  }, 0);

  if (existingEpCount === 0 && vsmovServers.length > 0) {
    // Build fresh from VSMOV API
    subtitleLog.push(`[VSMOV] No existing episodes, building from VSMOV API...`);
    for (const vSrv of vsmovServers) {
      const newEps: any[] = [];
      for (const vEp of vSrv.serverData) {
        if (!vEp.link_embed) continue;
        const { m3u8Url, subtitles } = await getEmbedData(vEp.link_embed);
        newEps.push({
          name: vEp.name,
          slug: vEp.slug || vEp.name.toLowerCase().replace(/\s+/g, '-'),
          filename: vEp.name,
          link_m3u8: m3u8Url,
          linkM3u8: m3u8Url,
          link_embed: vEp.link_embed,
          linkEmbed: vEp.link_embed,
          subtitles,
          time_intro_start: 0,
          time_intro_end: 0,
          time_outro_start: 0,
          time_outro_end: 0
        });
        subtitleLog.push(`[${vSrv.serverName}] ${vEp.name}: m3u8=${m3u8Url ? '✅' : '❌'} subs=${subtitles.length}`);
      }
      if (newEps.length > 0) {
        processedEpisodes.push({ serverName: vSrv.serverName, server_name: vSrv.serverName, serverData: newEps, server_data: newEps });
      }
    }
    return { episodes: processedEpisodes, subtitleLog };
  }

  // --- Step 4: Enrich existing episodes ---
  for (const server of processedEpisodes) {
    const serverName = cleanServerName(server.serverName || server.server_name || 'Unknown');
    const serverData: any[] = server.serverData || server.server_data || [];

    // Find matching VSMOV server (fuzzy: Vietsub matches "Vietsub #1", etc.)
    const vSmatch = vsmovServers.find(vs => {
      const a = vs.serverName.toLowerCase().replace(/[^a-z]/g, '');
      const b = serverName.toLowerCase().replace(/[^a-z]/g, '');
      return a.includes(b) || b.includes(a) || a.startsWith(b.substring(0, 5)) || b.startsWith(a.substring(0, 5));
    }) || vsmovServers[0]; // fallback to first server

    if (!Array.isArray(serverData)) continue;

    for (let epIdx = 0; epIdx < serverData.length; epIdx++) {
      const ep = serverData[epIdx];
      const epName = normalizeEpName(ep.name || ep.slug || '');

      // Find matching VSMOV episode by name or index
      let vEp = vSmatch?.serverData.find(ve => ve.name === epName);
      if (!vEp && vSmatch?.serverData[epIdx]) {
        vEp = vSmatch.serverData[epIdx]; // fallback by index
      }

      // Determine embed URL to use
      const existingEmbed = ep.link_embed || ep.linkEmbed || '';
      const vsmovEmbed = vEp?.link_embed || '';
      const embedUrl = existingEmbed.includes('streamvsmov.com') || existingEmbed.includes('vsmov.com')
        ? existingEmbed
        : (vsmovEmbed || existingEmbed);

      if (!embedUrl) {
        subtitleLog.push(`[${serverName}] ${epName}: ⚠️ Không có embed URL`);
        continue;
      }

      const { m3u8Url, subtitles } = await getEmbedData(embedUrl);

      // Set embed URL if missing
      if (!ep.link_embed && !ep.linkEmbed) {
        ep.link_embed = embedUrl;
        ep.linkEmbed = embedUrl;
      }

      // Set m3u8 if missing or empty
      if (m3u8Url && !ep.link_m3u8 && !ep.linkM3u8) {
        ep.link_m3u8 = m3u8Url;
        ep.linkM3u8 = m3u8Url;
      }

      // Set subtitles if missing
      const existingSubs = ep.subtitles || [];
      if (Array.isArray(existingSubs) && existingSubs.length > 0) {
        subtitleLog.push(`[${serverName}] ${epName}: Đã có ${existingSubs.length} phụ đề → Giữ nguyên`);
        continue;
      }

      if (subtitles.length > 0) {
        ep.subtitles = subtitles;
        subtitleLog.push(`[${serverName}] ${epName}: ✅ ${subtitles.length} phụ đề (${subtitles.map(s => s.label).join(', ')})`);
      } else {
        subtitleLog.push(`[${serverName}] ${epName}: ⚠️ Không tìm thấy phụ đề`);
      }
    }
  }

  console.log(`[VSMOV-Sub] Enrichment for "${movieSlug}":\n${subtitleLog.join('\n')}`);
  return { episodes: processedEpisodes, subtitleLog };
}
