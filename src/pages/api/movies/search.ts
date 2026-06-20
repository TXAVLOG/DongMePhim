import type { APIRoute } from 'astro';
import { MovieService } from '../../../services/MovieService';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async ({ url, request }) => {
  const query = url.searchParams.get('q') || '';
  if (!query) {
    return apiResponse({ data: [] }, 'success', '', 200, request);
  }

  try {
    const movies = await MovieService.searchMovies(query);
    // Limit to top 5-6 results for performance and UI constraints
    const limited = movies.slice(0, 6).map(m => ({
      title: m.title,
      originalTitle: m.originalTitle || '',
      slug: m.slug,
      posterUrl: m.posterUrl || '',
      releaseYear: m.releaseYear || 2024,
      quality: m.quality || 'FHD',
      lang: m.lang || 'Vietsub',
      category: m.category || '',
      genres: m.genres || [],
      episodeCurrent: m.episodeCurrent || 'Full',
      type: m.type || 'movie'
    }));
    return apiResponse({ data: limited }, 'success', '', 200, request);
  } catch (error) {
    console.error("API Search Error:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
