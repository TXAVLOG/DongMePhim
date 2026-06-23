import type { APIRoute } from 'astro';
import { MovieService } from '../../../services/MovieService';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') as any;
    const category = url.searchParams.get('category') || undefined;
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 4;
    const sortBy = url.searchParams.get('sortBy') || undefined;

    // Fetch movies from service
    const movies = await MovieService.getMovies({ type, category, limit, sortBy });

    // Map fields returned to client
    const mapped = movies.map((m: any) => ({
      id: m.id,
      title: m.title,
      originalTitle: m.originalTitle || m.origin_name || m.original_title || '',
      slug: m.slug,
      description: m.description || '',
      posterUrl: m.posterUrl || m.poster_url || m.poster || '',
      bannerUrl: m.bannerUrl || m.banner_url || m.thumb_url || '',
      releaseYear: m.releaseYear || m.release_year || m.year || 2024,
      durationMinutes: m.durationMinutes || m.duration_minutes || m.time || '',
      type: m.type,
      status: m.status,
      episodeCurrent: m.episodeCurrent || m.episode_current || 'Full',
      episodeTotal: m.episodeTotal || m.episode_total || '1',
      quality: m.quality || 'FHD',
      lang: m.lang || 'Vietsub',
      imdbScore: m.imdbScore || m.imdb_score || 8.0,
      category: m.category || '',
      genres: m.genres || [],
      episodes: m.episodes || []
    }));

    return apiResponse(mapped, 'success', 'Lấy danh sách phim thành công!', 200, request);
  } catch (err: any) {
    console.error('Lỗi API movies list:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
