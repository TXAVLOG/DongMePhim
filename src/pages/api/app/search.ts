import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { MovieService } from '@services/MovieService';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const q = url.searchParams.get('q') || url.searchParams.get('keyword') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10) || 1;
    const limit = parseInt(url.searchParams.get('limit') || '20', 10) || 20;

    const category = url.searchParams.get('category') || '';
    const region = url.searchParams.get('region') || '';
    const year = url.searchParams.get('year') || '';
    const type = url.searchParams.get('type') || '';

    let movies: any[] = [];

    if (q.trim()) {
      movies = await MovieService.searchMovies(q);
    } else {
      // If no query string, fetch list by filters
      movies = await MovieService.getMovies({
        type: type ? (type as any) : undefined,
        category: category || undefined,
        limit: 1000 // Get a larger batch for client-side filtering/pagination
      });
    }

    // Apply additional filters
    let filtered = movies;

    if (type && q.trim()) {
      filtered = filtered.filter(m => m.type === type);
    }
    if (category && q.trim()) {
      filtered = filtered.filter(m => {
        if (m.category === category) return true;
        if (Array.isArray(m.genres)) {
          return m.genres.some((g: string) => g.toLowerCase() === category.toLowerCase());
        }
        return false;
      });
    }
    if (region) {
      filtered = filtered.filter(m => 
        (m.category && m.category.toLowerCase().includes(region.toLowerCase())) ||
        (m.country && m.country.toLowerCase().includes(region.toLowerCase()))
      );
    }
    if (year) {
      filtered = filtered.filter(m => String(m.releaseYear || m.release_year) === String(year));
    }

    const total = filtered.length;
    const lastPage = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

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
