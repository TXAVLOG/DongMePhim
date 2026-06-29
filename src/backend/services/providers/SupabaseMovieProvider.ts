import { supabase } from '@lib/supabase';
import type { IMovieProvider, Movie, MovieDetail } from '@apptypes/movie';
import { seedMovies, mapKKPhimToMovieDetail, mapKKPhimSearchItemToMovie } from './LocalMovieProvider';
import { slugify } from '../../utils/categoryHelper';

export class SupabaseMovieProvider implements IMovieProvider {
  async getMovies(params?: { type?: 'movie' | 'series' | 'hoathinh' | 'tvshows', category?: string, limit?: number, sortBy?: string, slugs?: string[] }): Promise<Movie[]> {
    try {
      const selectFields = 'id, title, original_title, slug, description, poster_url, banner_url, release_year, duration_minutes, type, status, episode_current, episode_total, quality, lang, imdb_score, views, broadcast_at, genres, updated_at, broadcast_schedule, actors, directors, seasons, trailer_url, source';
      let query = supabase.from('movies').select(selectFields);

      if (params?.type) {
        query = query.eq('type', params.type);
      }

      if (params?.slugs && Array.isArray(params.slugs)) {
        query = query.in('slug', params.slugs);
      }

      const { data: dbMovies, error } = await query;
      if (error) throw error;

      let moviesList: Movie[] = [];
      if (dbMovies && dbMovies.length > 0) {
        moviesList = dbMovies.map((m: any) => ({
          id: m.id,
          title: m.title,
          originalTitle: m.original_title,
          slug: m.slug,
          description: m.description || '',
          posterUrl: m.poster_url || '',
          bannerUrl: m.banner_url || m.poster_url || '',
          releaseYear: m.release_year || 2024,
          durationMinutes: m.duration_minutes || '45 phút/tập',
          type: m.type as 'movie' | 'series' | 'hoathinh' | 'tvshows',
          status: m.status as 'completed' | 'ongoing',
          episodeCurrent: m.episode_current || '1',
          episodeTotal: m.episode_total || '1',
          quality: m.quality || 'FHD',
          lang: m.lang || 'Vietsub',
          imdbScore: Number(m.imdb_score) || 8.0,
          views: Number(m.views) || 0,
          commentCount: 0,
          category: Array.isArray(m.genres) && m.genres.length > 0 ? m.genres[0] : 'Khác',
          country: m.broadcast_at || 'Khác',
          genres: Array.isArray(m.genres) ? m.genres : [],
          updatedAt: m.updated_at || new Date().toISOString(),
          isStatic: false,
          broadcastSchedule: m.broadcast_schedule || undefined,
          actors: Array.isArray(m.actors) ? m.actors : [],
          directors: Array.isArray(m.directors) ? m.directors : [],
          episodes: Array.isArray(m.episodes) ? m.episodes : [],
          source: m.source || 'manual'
        }));
      }

      // Lấy danh sách phim hệ thống đã bị xóa từ database
      const { data: deletedData } = await supabase.from('txa_deleted_movies').select('slug');
      const deletedSlugs = new Set((deletedData || []).map((d: any) => d.slug));

      // Kết hợp với seedMovies để đảm bảo có phim mẫu nếu db trống, loại bỏ phim đã bị xóa
      const dbSlugs = new Set(moviesList.map(m => m.slug));
      const combined = [
        ...moviesList,
        ...seedMovies.filter(m => !dbSlugs.has(m.slug) && !deletedSlugs.has(m.slug)).map(m => ({ ...m, isStatic: true }))
      ];

      let result = combined;

      // Lọc theo category
      if (params?.category) {
        const cat = params.category;
        const catSlug = slugify(cat);
        if (cat === 'Lồng Tiếng' || catSlug === 'long-tieng') {
          result = result.filter(m => m.lang === 'Lồng Tiếng' || m.lang === 'Thuyết Minh' || (m.lang && m.lang.toLowerCase().includes('lồng tiếng')));
        } else if (cat === 'Châu Tinh Trì' || catSlug === 'chau-tinh-tri' || catSlug === 'chau-tinh-tri-xem-la-cuoi') {
          result = result.filter(m => 
            (Array.isArray(m.actors) && m.actors.some((a: any) => {
              const lower = (typeof a === 'string' ? a : a?.name || '').toLowerCase();
              return lower.includes('châu tinh trì') || lower.includes('stephen chow');
            })) ||
            (m.title && m.title.toLowerCase().includes('châu tinh trì'))
          );
        } else if (catSlug === 'toi-so-con-nguoi-em-roi-do') {
          result = result.filter(m => 
            Array.isArray(m.genres) && m.genres.some((g: string) => {
              const lower = (g || '').toLowerCase();
              return lower.includes('kinh dị') || lower.includes('ma') || lower.includes('thriller') || lower.includes('horror');
            })
          );
        } else if (catSlug === 'phim-thai-new') {
          result = result.filter(m => 
            m.category === 'Thái Lan' || 
            m.country === 'Thái Lan' || 
            (Array.isArray(m.genres) && m.genres.some((g: string) => (g || '').toLowerCase().includes('thái')))
          );
        } else {
          result = result.filter(m => {
            if (m.category === cat || (m.category && slugify(m.category) === catSlug)) return true;
            if (m.country === cat || (m.country && slugify(m.country) === catSlug)) return true;
            if (Array.isArray(m.genres)) {
              return m.genres.some((g: string) => g === cat || slugify(g) === catSlug);
            }
            return false;
          });
        }
      }

      // Sắp xếp
      if (params?.sortBy === 'imdb_score') {
        result.sort((a, b) => (b.imdbScore || 0) - (a.imdbScore || 0));
      } else if (params?.sortBy === 'views_comments') {
        result.sort((a, b) => (b.views || 0) - (a.views || 0));
      } else if (params?.sortBy === 'updatedAt' || !params?.sortBy) {
        result.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      }

      // Giới hạn
      if (params?.limit) {
        result = result.slice(0, params.limit);
      }

      return result;
    } catch (e) {
      console.error('Lỗi khi lấy danh sách phim từ Supabase:', e);
      return seedMovies;
    }
  }

  async getMovieBySlug(slug: string): Promise<MovieDetail | null> {
    try {
      // 0. Kiểm tra xem phim hệ thống đã bị xóa chưa
      const { data: deletedMovie } = await supabase
        .from('txa_deleted_movies')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      if (deletedMovie) {
        return null;
      }

      // 1. Kiểm tra database Supabase
      const { data: dbMovie, error } = await supabase
        .from('movies')
        .select('*, source')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;

      // Fallback: nếu không tìm thấy, thử slug đã được chuẩn hóa
      let finalDbMovie = dbMovie;
      if (!finalDbMovie) {
        const fallbackSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (fallbackSlug !== slug) {
          const { data: dbMovieFallback, error: errFallback } = await supabase
            .from('movies')
            .select('*, source')
            .eq('slug', fallbackSlug)
            .maybeSingle();
          if (!errFallback && dbMovieFallback) {
            finalDbMovie = dbMovieFallback;
          }
        }
      }

      if (finalDbMovie) {
        return {
          id: finalDbMovie.id,
          title: finalDbMovie.title,
          originalTitle: finalDbMovie.original_title,
          slug: finalDbMovie.slug,
          description: finalDbMovie.description || '',
          posterUrl: finalDbMovie.poster_url || '',
          bannerUrl: finalDbMovie.banner_url || finalDbMovie.poster_url || '',
          releaseYear: finalDbMovie.release_year || 2024,
          durationMinutes: finalDbMovie.duration_minutes || '45 phút/tập',
          type: finalDbMovie.type as 'movie' | 'series' | 'hoathinh' | 'tvshows',
          status: finalDbMovie.status as 'completed' | 'ongoing',
          episodeCurrent: finalDbMovie.episode_current || '1',
          episodeTotal: finalDbMovie.episode_total || '1',
          quality: finalDbMovie.quality || 'FHD',
          lang: finalDbMovie.lang || 'Vietsub',
          imdbScore: Number(finalDbMovie.imdb_score) || 8.0,
          views: Number(finalDbMovie.views) || 0,
          commentCount: 0,
          category: Array.isArray(finalDbMovie.genres) && finalDbMovie.genres.length > 0 ? finalDbMovie.genres[0] : 'Khác',
          country: finalDbMovie.broadcast_at || 'Khác',
          genres: Array.isArray(finalDbMovie.genres) ? finalDbMovie.genres : [],
          seasons: finalDbMovie.seasons || (finalDbMovie.type === 'movie' ? 'Bản Điện Ảnh' : 'Phần 1'),
          actors: Array.isArray(finalDbMovie.actors) ? finalDbMovie.actors : [],
          directors: Array.isArray(finalDbMovie.directors) ? finalDbMovie.directors : [],
          trailerUrl: finalDbMovie.trailer_url || '',
          episodes: Array.isArray(finalDbMovie.episodes) ? finalDbMovie.episodes : [],
          isStatic: false,
          broadcastSchedule: finalDbMovie.broadcast_schedule || undefined,
          source: finalDbMovie.source || 'manual'
        };
      }

      // 2. Kiểm tra seedMovies
      const movie = seedMovies.find(m => m.slug === slug);
      if (movie) {
        const totalEps = parseInt(movie.episodeTotal) || 1;
        const episodesData = [];
        for (let i = 1; i <= totalEps; i++) {
          episodesData.push({
            name: `Tập ${i}`,
            slug: `tap-${i}`,
            filename: `Tap ${i}.mp4`,
            linkEmbed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            linkM3u8: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            subtitles: [
              {
                label: "Tiếng Việt",
                file: "https://stream.dongmephim.online/subs/ep1135_vi.vtt"
              },
              {
                label: "English",
                file: "https://stream.dongmephim.online/subs/ep1135_en.vtt"
              }
            ],
            timeIntroStart: 5,
            timeIntroEnd: 15,
            timeOutroStart: 25,
            timeOutroEnd: 32
          });
        }
        const rawEpisodes = [
          {
            serverName: "DongMePhim VIP",
            serverData: episodesData
          },
          {
            serverName: "FPT Fast",
            serverData: episodesData
          }
        ];

        let type: 'movie' | 'series' | 'hoathinh' | 'tvshows' = 'series';
        if (movie.type === 'movie') type = 'movie';

        return {
          ...movie,
          type,
          actors: [],
          directors: [],
          trailerUrl: '',
          episodes: rawEpisodes,
          isStatic: true
        };
      }

      // 3. Fallback gọi API KKPhim
      const res = await fetch(`https://phimapi.com/phim/${slug}`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data && data.status && data.movie) {
          const detail = mapKKPhimToMovieDetail(data);
          if (detail) {
            return {
              ...detail,
              isStatic: false
            };
          }
        }
      }
    } catch (e) {
      console.warn(`Lỗi khi lấy chi tiết phim từ Supabase cho slug: ${slug}`, e);
    }
    return null;
  }

  async getRelatedMovies(movieId: string): Promise<Movie[]> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(movieId);
      const selectFields = 'id, title, original_title, slug, description, poster_url, banner_url, release_year, duration_minutes, type, status, episode_current, episode_total, quality, lang, imdb_score, views, broadcast_at, genres, updated_at, broadcast_schedule, actors, directors, seasons, trailer_url';
      let query = supabase.from('movies').select(selectFields);
      if (isUuid) {
        query = query.neq('id', movieId);
      }

      const { data: dbMovies, error } = await query.limit(5);

      if (error) throw error;

      // Lấy danh sách phim hệ thống đã bị xóa từ database
      const { data: deletedData } = await supabase.from('txa_deleted_movies').select('slug');
      const deletedSlugs = new Set((deletedData || []).map((d: any) => d.slug));

      let list: Movie[] = [];
      if (dbMovies && dbMovies.length > 0) {
        list = dbMovies.map((m: any) => ({
          id: m.id,
          title: m.title,
          originalTitle: m.original_title,
          slug: m.slug,
          description: m.description || '',
          posterUrl: m.poster_url || '',
          bannerUrl: m.banner_url || m.poster_url || '',
          releaseYear: m.release_year || 2024,
          durationMinutes: m.duration_minutes || '45 phút/tập',
          type: m.type as 'movie' | 'series' | 'hoathinh' | 'tvshows',
          status: m.status as 'completed' | 'ongoing',
          episodeCurrent: m.episode_current || '1',
          episodeTotal: m.episode_total || '1',
          quality: m.quality || 'FHD',
          lang: m.lang || 'Vietsub',
          imdbScore: Number(m.imdb_score) || 8.0,
          views: Number(m.views) || 0,
          commentCount: 0,
          category: m.broadcast_at || 'Khác',
          genres: Array.isArray(m.genres) ? m.genres : [],
          updatedAt: m.updated_at || new Date().toISOString(),
          isStatic: false,
          broadcastSchedule: m.broadcast_schedule || undefined,
          actors: Array.isArray(m.actors) ? m.actors : [],
          directors: Array.isArray(m.directors) ? m.directors : []
        }));

        if (!isUuid) {
          list = list.filter(m => m.id !== movieId);
        }
        list = list.filter(m => !deletedSlugs.has(m.slug));
      }

      const dbSlugs = new Set(list.map(m => m.slug));
      const combined = [
        ...list,
        ...seedMovies.filter(m => m.id !== movieId && !dbSlugs.has(m.slug) && !deletedSlugs.has(m.slug)).map(m => ({ ...m, isStatic: true }))
      ];
      return combined.slice(0, 4);

    } catch (e) {
      console.warn('Lỗi khi lấy phim liên quan từ Supabase:', e);
    }

    try {
      const { data: deletedData } = await supabase.from('txa_deleted_movies').select('slug');
      const deletedSlugs = new Set((deletedData || []).map((d: any) => d.slug));
      return seedMovies.filter(m => m.id !== movieId && !deletedSlugs.has(m.slug)).map(m => ({ ...m, isStatic: true })).slice(0, 4);
    } catch (e) {
      return seedMovies.filter(m => m.id !== movieId).map(m => ({ ...m, isStatic: true })).slice(0, 4);
    }
  }

  async searchMovies(query: string): Promise<Movie[]> {
    try {
      const selectFields = 'id, title, original_title, slug, description, poster_url, banner_url, release_year, duration_minutes, type, status, episode_current, episode_total, quality, lang, imdb_score, views, broadcast_at, genres, updated_at, broadcast_schedule, actors, directors, seasons, trailer_url';
      const { data: dbMovies, error } = await supabase
        .from('movies')
        .select(selectFields)
        .or(`title.ilike.%${query}%,original_title.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      if (dbMovies && dbMovies.length > 0) {
        return dbMovies.map((m: any) => ({
          id: m.id,
          title: m.title,
          originalTitle: m.original_title,
          slug: m.slug,
          description: m.description || '',
          posterUrl: m.poster_url || '',
          bannerUrl: m.banner_url || m.poster_url || '',
          releaseYear: m.release_year || 2024,
          durationMinutes: m.duration_minutes || '45 phút/tập',
          type: m.type as 'movie' | 'series' | 'hoathinh' | 'tvshows',
          status: m.status as 'completed' | 'ongoing',
          episodeCurrent: m.episode_current || '1',
          episodeTotal: m.episode_total || '1',
          quality: m.quality || 'FHD',
          lang: m.lang || 'Vietsub',
          imdbScore: Number(m.imdb_score) || 8.0,
          views: Number(m.views) || 0,
          commentCount: 0,
          category: Array.isArray(m.genres) && m.genres.length > 0 ? m.genres[0] : 'Khác',
          country: m.broadcast_at || 'Khác',
          genres: Array.isArray(m.genres) ? m.genres : [],
          updatedAt: m.updated_at || new Date().toISOString(),
          actors: Array.isArray(m.actors) ? m.actors : [],
          directors: Array.isArray(m.directors) ? m.directors : []
        }));
      }

      // Fallback KKPhim API search
      const res = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data && data.status === "success" && data.data && Array.isArray(data.data.items)) {
          const cdnDomain = data.data.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com";
          return data.data.items.map((item: any) => mapKKPhimSearchItemToMovie(item, cdnDomain));
        }
      }
    } catch (e) {
      console.warn('Lỗi khi tìm kiếm phim trên Supabase:', e);
    }
    return [];
  }
}
