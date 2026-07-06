import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const embedUrl = url.searchParams.get('url');
  if (!embedUrl) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch embed page: ${res.statusText}`);
    }

    const html = await res.text();
    // Use regex to parse playerOptions and subtitles
    const subtitlesMatch = html.match(/subtitles:\s*(\[.*?\]),/s);
    if (!subtitlesMatch) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    let rawSubs = [];
    try {
      rawSubs = JSON.parse(subtitlesMatch[1]);
    } catch (pe) {
      console.warn("JSON parse of subtitles failed, trying regex extraction:", pe);
      const subItems = [];
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

    const parsedUrl = new URL(embedUrl);
    const origin = parsedUrl.origin;

    const formattedSubs = rawSubs.map((sub: any) => {
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

      // Proxy through our proxy-subtitle endpoint to bypass CORS
      const proxyUrl = `/api/proxy-subtitle?url=${encodeURIComponent(subUrl)}`;

      return {
        label,
        file: proxyUrl,
        default: sub.code === 'vie'
      };
    });

    return new Response(JSON.stringify(formattedSubs), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800'
      }
    });
  } catch (err: any) {
    console.error('Error fetching VSMOV subtitles:', err);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
