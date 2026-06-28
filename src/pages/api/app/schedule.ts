import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { MovieService } from '@services/MovieService';

export const GET: APIRoute = async ({ request }) => {
  try {
    const movies = await MovieService.getMovies({ limit: 15 });

    const scheduleData = [];
    const today = new Date();

    // Generate schedule for 5 days starting from today
    for (let i = 0; i < 5; i++) {
      const dateObj = new Date(today);
      dateObj.setDate(today.getDate() + i);
      const dateStr = dateObj.toISOString().split('T')[0];

      // Grab 3 movies for this day
      const dayMovies = movies.slice(i * 3, (i + 1) * 3);
      const mappedMovies = dayMovies.map((m: any) => {
        const seqId = parseInt(m.movie_id_seq || m.movieIdSeq || m.id, 10) || m.id;
        return {
          id: seqId,
          name: m.title,
          slug: m.slug,
          thumb_url: m.bannerUrl || m.banner_url || m.posterUrl || m.poster_url || "",
          poster_url: m.posterUrl || m.poster_url || "",
          type: m.type || "movie",
          next_episode_name: m.type === 'movie' ? 'Full' : 'Tập tiếp theo',
          episode_current: m.episodeCurrent || m.episode_current || "1",
          broadcast_time: `${19 + (i % 2)}:30`,
          quality: m.quality || "FHD"
        };
      });

      if (mappedMovies.length > 0) {
        scheduleData.push({
          date: dateStr,
          movies: mappedMovies
        });
      }
    }

    return apiResponse(scheduleData, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
