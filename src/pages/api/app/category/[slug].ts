import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { MovieService } from '@services/MovieService';

export const GET: APIRoute = async ({ params, request, url }) => {
  try {
    const { slug } = params;
    if (!slug) {
      return apiResponse(null, 'error', 'Missing category slug', 400, request);
    }

    const page = parseInt(url.searchParams.get('page') || '1', 10) || 1;
    const limit = parseInt(url.searchParams.get('limit') || '20', 10) || 20;

    // Get movies belonging to this category slug
    const movies = await MovieService.getMovies({
      category: slug,
      limit: 1000
    });

    const total = movies.length;
    const lastPage = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = movies.slice(offset, offset + limit);

    // Map to app structure
    const mapped = paginated.map((m: any) => {
      const seqId = parseInt(m.movie_id_seq || m.movieIdSeq || m.id, 10) || m.id;
      return {
        id: seqId,
        name: m.title,
        origin_name: m.originalTitle || m.original_title || "",
        slug: m.slug,
        thumb_url: m.bannerUrl || m.banner_url || m.posterUrl || m.poster_url || "",
        poster_url: m.posterUrl || m.poster_url || "",
        type: m.type || "movie",
        episode_current: m.episodeCurrent || m.episode_current || "",
        quality: m.quality || "FHD",
        lang: m.lang || "Vietsub",
        year: parseInt(m.releaseYear || m.release_year, 10) || 2026,
        time: m.durationMinutes || m.duration_minutes || ""
      };
    });

    const responsePayload = {
      data: mapped,
      pagination: {
        total,
        per_page: limit,
        current_page: page,
        last_page: lastPage
      }
    };

    return apiResponse(responsePayload, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
