import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  const ep = url.searchParams.get('ep');

  if (!slug || !ep) {
    return new Response('WEBVTT\n\n', {
      status: 400,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const { data: movie, error } = await supabase
      .from('movies')
      .select('episodes')
      .eq('slug', slug)
      .single();

    if (error || !movie || !Array.isArray(movie.episodes)) {
      return new Response('WEBVTT\n\n', {
        status: 404,
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Find the subtitle in episodes
    let subtitlesSrt = '';
    
    for (const server of movie.episodes) {
      const serverData = server.serverData || server.server_data || [];
      const episode = serverData.find((e: any) => e.slug === ep);
      if (episode) {
        subtitlesSrt = episode.subtitles_srt || episode.subtitlesSrt || '';
        break;
      }
    }

    if (!subtitlesSrt) {
      return new Response('WEBVTT\n\n', {
        status: 404,
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Return the subtitles_srt as plain text / srt
    return new Response(subtitlesSrt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err: any) {
    return new Response('WEBVTT\n\n', {
      status: 500,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
