import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { MovieService } from '@services/MovieService';
import { supabase } from '@lib/supabase';

function getNextEpisodeName(episodeCurrent: string, type: string): string {
  if (type === 'movie') return 'Full';
  
  const current = (episodeCurrent || '').trim();
  // Match the last number in the string (e.g. "Tập 148" -> "148")
  const match = current.match(/(\d+)(?!.*\d)/);
  if (match) {
    const currentNum = parseInt(match[1], 10);
    const nextNum = currentNum + 1;
    const isPadded = match[1].startsWith('0') && match[1].length > 1;
    const nextNumStr = isPadded ? String(nextNum).padStart(match[1].length, '0') : String(nextNum);
    return `Tập ${nextNumStr}`;
  }
  return 'Tập tiếp theo';
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date'); // YYYY-MM-DD
    
    let nowMs = Date.now();
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const parts = dateParam.split('-');
      // Create local date in Vietnam timezone (+7)
      const utcTime = Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      // Subtract 7 hours to get the UTC time that represents 00:00 local time
      nowMs = utcTime - 7 * 60 * 60 * 1000;
    }

    // Generate schedule for 7 days starting from base date
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dateObj = new Date(nowMs + 7 * 60 * 60 * 1000 + i * 24 * 60 * 60 * 1000);
      dates.push(dateObj.toISOString().split('T')[0]);
    }

    let allMovies: any[] = [];
    const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'supabase';

    if (providerType === 'supabase') {
      const { data } = await supabase
        .from('movies')
        .select('id, movie_id_seq, title, slug, banner_url, poster_url, type, episode_current, quality, broadcast_schedule')
        .not('broadcast_schedule', 'is', null);
      allMovies = data || [];
    } else {
      allMovies = await MovieService.getMovies({ limit: 100 });
    }

    // Filter movies that have broadcast schedule
    const scheduledMovies = allMovies.filter((m: any) => {
      const schedule = m.broadcast_schedule || m.broadcastSchedule;
      return schedule && schedule.nextDate;
    });

    const hasAnySchedule = scheduledMovies.length > 0;
    const scheduleData = [];

    if (!hasAnySchedule) {
      // Fallback to mock logic if no schedules are configured (useful for local development)
      const fallbackMovies = allMovies.slice(0, 21);
      for (let i = 0; i < 7; i++) {
        const dateStr = dates[i];
        const dayMovies = fallbackMovies.slice(i * 3, (i + 1) * 3);
        const mappedMovies = dayMovies.map((m: any) => {
          const seqId = parseInt(m.movie_id_seq || m.movieIdSeq || m.id, 10) || m.id;
          const currentEp = m.episodeCurrent || m.episode_current || "1";
          const type = m.type || "series";
          return {
            id: seqId,
            name: m.title,
            slug: m.slug,
            thumb_url: m.bannerUrl || m.banner_url || m.posterUrl || m.poster_url || "",
            poster_url: m.posterUrl || m.poster_url || "",
            type: type,
            next_episode_name: getNextEpisodeName(currentEp, type),
            episode_current: currentEp,
            broadcast_time: `${19 + (i % 2)}:30`,
            quality: m.quality || "FHD"
          };
        });

        scheduleData.push({
          date: dateStr,
          movies: mappedMovies
        });
      }
    } else {
      // Use real database schedules
      for (const dateStr of dates) {
        const dayMovies = scheduledMovies.filter((m: any) => {
          const schedule = m.broadcast_schedule || m.broadcastSchedule;
          return schedule.nextDate === dateStr;
        });

        // Sort dayMovies by broadcast time
        dayMovies.sort((a: any, b: any) => {
          const schedA = a.broadcast_schedule || a.broadcastSchedule || {};
          const schedB = b.broadcast_schedule || b.broadcastSchedule || {};
          const timeA = schedA.nextTime || '20:00';
          const timeB = schedB.nextTime || '20:00';
          return timeA.localeCompare(timeB);
        });

        const mappedMovies = dayMovies.map((m: any) => {
          const seqId = parseInt(m.movie_id_seq || m.movieIdSeq || m.id, 10) || m.id;
          const currentEp = m.episodeCurrent || m.episode_current || "1";
          const type = m.type || "series";
          const sched = m.broadcast_schedule || m.broadcastSchedule || {};
          
          return {
            id: seqId,
            name: m.title,
            slug: m.slug,
            thumb_url: m.bannerUrl || m.banner_url || m.posterUrl || m.poster_url || "",
            poster_url: m.posterUrl || m.poster_url || "",
            type: type,
            next_episode_name: sched.nextEpisode || sched.next_episode || getNextEpisodeName(currentEp, type),
            episode_current: currentEp,
            broadcast_time: sched.nextTime || "20:00",
            quality: m.quality || "FHD"
          };
        });

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
