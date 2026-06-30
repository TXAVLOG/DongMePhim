import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const subtitleUrl = url.searchParams.get('url');

  if (!subtitleUrl) {
    return new Response('WEBVTT\n\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const res = await fetch(subtitleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!res.ok) {
      console.warn(`Failed to fetch subtitle from source ${subtitleUrl}: ${res.statusText}`);
      return new Response('WEBVTT\n\n', {
        status: 200,
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const contentType = res.headers.get('Content-Type') || '';
    const isImage = contentType.startsWith('image/') || subtitleUrl.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)/);

    if (isImage) {
      const buffer = await res.arrayBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'image/jpeg',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    const text = await res.text();
    const finalContentType = subtitleUrl.toLowerCase().endsWith('.srt') ? 'text/srt' : 'text/vtt';

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': `${finalContentType}; charset=utf-8`,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error: any) {
    console.warn(`Error proxying subtitle from ${subtitleUrl}:`, error.message || error);
    return new Response('WEBVTT\n\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

