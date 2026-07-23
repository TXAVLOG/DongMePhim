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
  originalUrl?: string;
}

interface EmbedData {
  m3u8Url: string;
  subtitles: SubtitleEntry[];
}

export interface ExtractedSubtitle {
  serverName: string;
  episodeName: string;
  episodeIndex: number;
  label: string;
  originalUrl: string;
  proxyUrl: string;
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
      subtitles.push({ label, file: proxyUrl, default: sub.code === 'vie', originalUrl: subUrl });
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
 * fetches embed page to extract subtitles only (no DB update).
 * 
 * Returns the list of extracted subtitles, showing the original link
 * and proxy link for copy-paste in admin panel.
 */
export async function crawlSubtitlesListFromVsmov(
  vsmovSlug: string,
  movieTitle?: string
): Promise<{ success: boolean; subtitles: ExtractedSubtitle[]; log: string[] }> {
  const log: string[] = [];
  const subtitlesList: ExtractedSubtitle[] = [];

  let targetSlug = (vsmovSlug || '').trim();

  if (!targetSlug) {
    log.push(`[VSMOV] Không nhập link VSMOV. Tự động truy vấn theo thông tin phim.`);
  } else {
    log.push(`[VSMOV] Truy vấn VSMOV với slug: "${targetSlug}"`);
  }

  // 1. Thử lấy dữ liệu từ VSMOV API với targetSlug
  let vsmovServers: any[] = [];
  if (targetSlug) {
    try {
      const apiUrl = `https://vsmov.com/api/phim/${targetSlug}`;
      const apiRes = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://vsmov.com/' },
        signal: AbortSignal.timeout(15000)
      });
      if (apiRes.ok) {
        const apiJson = await apiRes.json() as any;
        if (apiJson.status && Array.isArray(apiJson.episodes) && apiJson.episodes.length > 0) {
          vsmovServers = apiJson.episodes;
          log.push(`[VSMOV] Khớp dữ liệu từ API VSMOV (slug: "${targetSlug}"): Tìm thấy ${vsmovServers.length} server(s)`);
        } else {
          log.push(`[VSMOV] API VSMOV (slug: "${targetSlug}") trả về không có tập phim.`);
        }
      } else {
        log.push(`[VSMOV] Thử truy vấn slug "${targetSlug}" thất bại (HTTP ${apiRes.status})`);
      }
    } catch (err: any) {
      log.push(`[VSMOV] Lỗi kết nối API cho slug "${targetSlug}": ${err.message}`);
    }
  }

  // 2. Nếu chưa tìm được và có movieTitle (hoặc targetSlug bị sai), tự động tìm kiếm trên VSMOV
  if (vsmovServers.length === 0 && movieTitle) {
    const keyword = movieTitle.trim();
    try {
      log.push(`[VSMOV] Đang tự động tìm kiếm từ khóa "${keyword}" trên VSMOV API (/api/tim-kiem)...`);
      const searchUrl = `https://vsmov.com/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=5`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://vsmov.com/' },
        signal: AbortSignal.timeout(15000)
      });

      if (searchRes.ok) {
        const searchJson = await searchRes.json() as any;
        const items = searchJson?.data?.items || searchJson?.items || [];
        if (Array.isArray(items) && items.length > 0) {
          const matchedItem = items[0];
          const foundSlug = matchedItem.slug;
          log.push(`[VSMOV] Found match on VSMOV: "${matchedItem.name}" -> slug: "${foundSlug}"`);

          const detailUrl = `https://vsmov.com/api/phim/${foundSlug}`;
          const detailRes = await fetch(detailUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://vsmov.com/' },
            signal: AbortSignal.timeout(15000)
          });
          if (detailRes.ok) {
            const detailJson = await detailRes.json() as any;
            if (detailJson.status && Array.isArray(detailJson.episodes)) {
              vsmovServers = detailJson.episodes;
              log.push(`[VSMOV] Lấy dữ liệu thành công từ phim "${matchedItem.name}": ${vsmovServers.length} server(s)`);
            }
          }
        } else {
          log.push(`[VSMOV] Không tìm thấy kết quả phù hợp cho từ khóa "${keyword}" trên VSMOV.`);
        }
      }
    } catch (searchErr: any) {
      log.push(`[VSMOV] Lỗi khi tự động tìm kiếm trên VSMOV: ${searchErr.message}`);
    }
  }

  if (vsmovServers.length === 0) {
    log.push(`[VSMOV] Không thể cào phụ đề: Không tìm thấy dữ liệu nguồn phim trên VSMOV.`);
    return { success: false, subtitles: [], log };
  }

  // Iterate servers and episodes to fetch embeds
  for (const srv of vsmovServers) {
    const rawSrvName = srv.server_name || srv.serverName || 'Unknown';
    const serverName = cleanServerName(rawSrvName);
    const eps = srv.server_data || srv.serverData || [];

    if (!Array.isArray(eps) || eps.length === 0) continue;

    for (let epIndex = 0; epIndex < eps.length; epIndex++) {
      const ep = eps[epIndex];
      const epName = normalizeEpName(ep.name || '');
      const embedUrl = ep.link_embed || ep.linkEmbed || '';

      if (!embedUrl) {
        log.push(`[${serverName}] ${epName}: ⚠️ Không có URL embed`);
        continue;
      }

      try {
        const { subtitles } = await fetchEmbedData(embedUrl);
        if (subtitles && subtitles.length > 0) {
          log.push(`[${serverName}] ${epName}: ✅ Tìm thấy ${subtitles.length} phụ đề`);
          for (const sub of subtitles) {
            subtitlesList.push({
              serverName,
              episodeName: epName,
              episodeIndex: epIndex,
              label: sub.label,
              originalUrl: sub.originalUrl || '',
              proxyUrl: sub.file
            });
          }
        } else {
          log.push(`[${serverName}] ${epName}: ⚠️ Không tìm thấy phụ đề`);
        }
      } catch (err: any) {
        log.push(`[${serverName}] ${epName}: ❌ Lỗi cào embed: ${err.message}`);
      }
    }
  }

  return {
    success: true,
    subtitles: subtitlesList,
    log
  };
}

/**
 * Legacy enrich function kept for cron crawlers.
 */
export async function enrichVsmovEpisodesWithSubtitles(
  episodes: any[],
  movieSlug: string
): Promise<{ episodes: any[]; subtitleLog: string[] }> {
  const subtitleLog: string[] = [];

  if (!movieSlug) return { episodes, subtitleLog };

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
      }
    }
  } catch (err: any) {
    subtitleLog.push(`[VSMOV-API] API error: ${err.message}`);
  }

  const embedCache = new Map<string, EmbedData>();
  async function getEmbedData(embedUrl: string): Promise<EmbedData> {
    if (!embedUrl) return { m3u8Url: '', subtitles: [] };
    if (embedCache.has(embedUrl)) return embedCache.get(embedUrl)!;
    const data = await fetchEmbedData(embedUrl);
    embedCache.set(embedUrl, data);
    return data;
  }

  const processedEpisodes = Array.isArray(episodes) ? [...episodes] : [];

  for (const server of processedEpisodes) {
    const serverName = cleanServerName(server.serverName || server.server_name || 'Unknown');
    const serverData: any[] = server.serverData || server.server_data || [];

    const vSmatch = vsmovServers.find(vs => {
      const a = vs.serverName.toLowerCase().replace(/[^a-z]/g, '');
      const b = serverName.toLowerCase().replace(/[^a-z]/g, '');
      return a.includes(b) || b.includes(a);
    }) || vsmovServers[0];

    if (!Array.isArray(serverData)) continue;

    for (let epIdx = 0; epIdx < serverData.length; epIdx++) {
      const ep = serverData[epIdx];
      const epName = normalizeEpName(ep.name || ep.slug || '');

      let vEp = vSmatch?.serverData.find(ve => ve.name === epName);
      if (!vEp && vSmatch?.serverData[epIdx]) {
        vEp = vSmatch.serverData[epIdx];
      }

      const existingEmbed = ep.link_embed || ep.linkEmbed || '';
      const vsmovEmbed = vEp?.link_embed || '';
      const embedUrl = existingEmbed.includes('streamvsmov.com') || existingEmbed.includes('vsmov.com')
        ? existingEmbed
        : (vsmovEmbed || existingEmbed);

      if (!embedUrl) continue;

      const { m3u8Url, subtitles } = await getEmbedData(embedUrl);

      if (!ep.link_embed && !ep.linkEmbed) {
        ep.link_embed = embedUrl;
        ep.linkEmbed = embedUrl;
      }

      if (m3u8Url && !ep.link_m3u8 && !ep.linkM3u8) {
        ep.link_m3u8 = m3u8Url;
        ep.linkM3u8 = m3u8Url;
      }

      const existingSubs = ep.subtitles || [];
      if (Array.isArray(existingSubs) && existingSubs.length > 0) continue;

      if (subtitles.length > 0) {
        ep.subtitles = subtitles.map(s => ({
          label: s.label,
          file: s.file,
          default: s.default
        }));
        subtitleLog.push(`[${serverName}] ${epName}: ✅ Added ${subtitles.length} subs`);
      }
    }
  }

  return { episodes: processedEpisodes, subtitleLog };
}
