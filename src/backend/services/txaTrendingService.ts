import { supabase } from '@lib/supabase';
import type { Movie } from '@apptypes/movie';

export const TxaTrendingService = {
  getTopTrending: async (type: 'movie' | 'series', limit: number = 10): Promise<Movie[]> => {
    try {
      const { data, error } = await supabase
        .from('mv_movie_trending_stats')
        .select(`
          unique_viewers_24h,
          views_24h,
          total_watch_time_24h,
          favorites_24h,
          comments_24h,
          growth_velocity,
          age_hours,
          movies!inner (
            id,
            title,
            original_title,
            slug,
            description,
            poster_url,
            banner_url,
            release_year,
            duration_minutes,
            type,
            status,
            episode_current,
            episode_total,
            quality,
            lang,
            imdb_score,
            tmdb_score,
            views,
            country,
            genres,
            updated_at
          )
        `)
        .eq('type', type);

      if (error) throw error;

      if (!data || data.length === 0) return [];

      const mapped = data.map((item: any) => {
        const m = item.movies;
        const uv = Number(item.unique_viewers_24h) || 0;
        const views = Number(item.views_24h) || 0;
        const watchTime = Number(item.total_watch_time_24h) || 0;
        const favs = Number(item.favorites_24h) || 0;
        const comments = Number(item.comments_24h) || 0;
        const velocity = Number(item.growth_velocity) || 1.0;
        const age = Number(item.age_hours) || 0;
        
        let score = 0;
        if (uv === 0 && views === 0) {
          score = (Number(m.imdb_score) || Number(m.tmdb_score) || 8.0) * 10;
        } else {
          score = ((4 * uv + 0.0017 * watchTime + 15 * favs + 8 * comments) * velocity) / Math.pow((age / 24 + 2), 1.5);
        }

        return {
          id: m.id,
          title: m.title,
          originalTitle: m.original_title,
          slug: m.slug,
          description: m.description || '',
          posterUrl: m.poster_url || '',
          bannerUrl: m.banner_url || m.poster_url || '',
          releaseYear: m.release_year || 2024,
          durationMinutes: m.duration_minutes || '',
          type: m.type,
          status: m.status,
          episodeCurrent: m.episode_current || '1',
          episodeTotal: m.episode_total || '1',
          quality: m.quality || 'FHD',
          lang: m.lang || 'Vietsub',
          imdbScore: Number(m.imdb_score) || 8.0,
          tmdbScore: m.tmdb_score != null ? Number(m.tmdb_score) : undefined,
          views: Number(m.views) || 0,
          commentCount: 0,
          category: Array.isArray(m.genres) && m.genres.length > 0 ? m.genres[0] : 'Khác',
          country: m.country || 'Khác',
          genres: Array.isArray(m.genres) ? m.genres : [],
          updatedAt: m.updated_at || new Date().toISOString(),
          isStatic: false,
          trendingScore: Math.round(score * 10) / 10
        };
      });

      mapped.sort((a, b) => b.trendingScore - a.trendingScore);
      return mapped.slice(0, limit);
    } catch (err) {
      console.error('Lỗi khi lấy phim xu hướng:', err);
      return [];
    }
  },

  getPersonalizedRecommendations: async (userId: string | null, limit: number = 10): Promise<Movie[]> => {
    try {
      const { data, error } = await supabase
        .rpc('get_personalized_recommendations', {
          p_user_id: userId,
          p_limit: limit
        });

      if (error) throw error;

      if (!data || data.length === 0) return [];

      return data.map((m: any) => ({
        id: m.id,
        title: m.title,
        originalTitle: '',
        slug: m.slug,
        description: '',
        posterUrl: m.poster_url || '',
        bannerUrl: m.banner_url || m.poster_url || '',
        releaseYear: m.release_year || 2024,
        durationMinutes: '',
        type: m.type,
        status: m.status,
        episodeCurrent: '1',
        episodeTotal: '1',
        quality: m.quality || 'FHD',
        lang: 'Vietsub',
        imdbScore: Number(m.imdb_score) || 8.0,
        views: 0,
        commentCount: 0,
        category: 'Khác',
        country: 'Khác',
        genres: [],
        updatedAt: new Date().toISOString(),
        isStatic: false,
        trendingScore: Math.round(Number(m.trending_score) * 10) / 10
      }));
    } catch (err) {
      console.error('Lỗi khi lấy phim đề xuất:', err);
      return [];
    }
  }
};
