/**
 * Utility to fetch VSMOV subtitles from embed pages and attach them to episode data.
 * Used during crawling to pre-fetch subtitles so they're stored in the database
 * rather than fetched at runtime by the player.
 */

interface SubtitleEntry {
  label: string;
  file: string;
  default: boolean;
}

/**
 * Fetches subtitles from a VSMOV embed page.
 * Returns an array of subtitle entries, or empty array if none found.
 */
export async function fetchSubtitlesFromVsmovEmbed(embedUrl: string): Promise<SubtitleEntry[]> {
  if (!embedUrl) return [];

  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      console.log(`[VSMOV-Sub] Embed fetch failed (HTTP ${res.status}) for: ${embedUrl}`);
      return [];
    }

    const html = await res.text();

    // Parse subtitles from playerOptions in the embed page HTML
    const subtitlesMatch = html.match(/subtitles:\s*(\[.*?\]),/s);
    if (!subtitlesMatch) {
      console.log(`[VSMOV-Sub] No subtitles block found in embed page: ${embedUrl}`);
      return [];
    }

    let rawSubs: any[] = [];
    try {
      rawSubs = JSON.parse(subtitlesMatch[1]);
    } catch (pe) {
      // Fallback: try regex extraction for malformed JSON
      const subItems: any[] = [];
      const itemRegex = /\{"name":"(.*?)","type":"(.*?)","url":"(.*?)","code":"(.*?)"\}/g;
      let match;
      while ((match = itemRegex.exec(subtitlesMatch[1])) !== null) {
        subItems.push({
          name: match[1],
          type: match[2],
          url: match[3],
          code: match[4]
        });
      }
      rawSubs = subItems;
    }

    if (rawSubs.length === 0) {
      console.log(`[VSMOV-Sub] Subtitles block found but empty for: ${embedUrl}`);
      return [];
    }

    const parsedUrl = new URL(embedUrl);
    const origin = parsedUrl.origin;

    const formattedSubs: SubtitleEntry[] = rawSubs.map((sub: any) => {
      let label = sub.name || sub.code || 'Phụ đề';
      if (sub.code === 'vie' || label.toLowerCase().startsWith('vie')) {
        label = 'Tiếng Việt';
      } else if (sub.code === 'eng' || label.toLowerCase().startsWith('eng')) {
        label = 'English';
      }

      let subUrl = sub.url || '';
      if (subUrl.startsWith('/')) {
        subUrl = `${origin}${subUrl}`;
      }

      // Use proxy endpoint to bypass CORS when played in browser
      const proxyUrl = `/api/proxy-subtitle?url=${encodeURIComponent(subUrl)}`;

      return {
        label,
        file: proxyUrl,
        default: sub.code === 'vie'
      };
    });

    console.log(`[VSMOV-Sub] Found ${formattedSubs.length} subtitle(s) for: ${embedUrl} → [${formattedSubs.map(s => s.label).join(', ')}]`);
    return formattedSubs;

  } catch (err: any) {
    console.error(`[VSMOV-Sub] Error fetching subtitles from embed: ${embedUrl}`, err.message || err);
    return [];
  }
}

/**
 * Given a movie's episodes array, for every episode that has a VSMOV embed URL
 * and no existing subtitles, fetch subtitles from the embed page and attach them.
 * 
 * Modifies the episodes array in-place AND returns it.
 * Logs clearly for each episode whether subtitles were found or skipped.
 */
export async function enrichVsmovEpisodesWithSubtitles(
  episodes: any[],
  movieSlug: string
): Promise<{ episodes: any[]; subtitleLog: string[] }> {
  const subtitleLog: string[] = [];

  if (!Array.isArray(episodes) || episodes.length === 0) {
    return { episodes, subtitleLog };
  }

  for (const server of episodes) {
    const serverName = server.serverName || server.server_name || 'Unknown';
    const serverData = server.serverData || server.server_data || [];

    if (!Array.isArray(serverData)) continue;

    for (const ep of serverData) {
      const embedUrl = ep.linkEmbed || ep.link_embed || '';
      const isVsmov = embedUrl.includes('streamvsmov.com') || embedUrl.includes('vsmov.com');

      if (!isVsmov) continue;

      // Skip if already has subtitles
      const existingSubs = ep.subtitles || [];
      if (Array.isArray(existingSubs) && existingSubs.length > 0) {
        subtitleLog.push(`[${serverName}] ${ep.name}: Đã có ${existingSubs.length} phụ đề → Bỏ qua`);
        continue;
      }

      // Fetch subtitles from embed page
      try {
        const subs = await fetchSubtitlesFromVsmovEmbed(embedUrl);
        if (subs.length > 0) {
          ep.subtitles = subs;
          subtitleLog.push(`[${serverName}] ${ep.name}: ✅ Tìm thấy ${subs.length} phụ đề (${subs.map(s => s.label).join(', ')})`);
        } else {
          subtitleLog.push(`[${serverName}] ${ep.name}: ⚠️ Không tìm thấy phụ đề từ embed`);
        }
      } catch (err: any) {
        subtitleLog.push(`[${serverName}] ${ep.name}: ❌ Lỗi fetch phụ đề: ${err.message}`);
      }
    }
  }

  if (subtitleLog.length > 0) {
    console.log(`[VSMOV-Sub] Subtitle enrichment for "${movieSlug}":\n${subtitleLog.join('\n')}`);
  }

  return { episodes, subtitleLog };
}
