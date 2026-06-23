import { LocalMovieProvider } from './providers/LocalMovieProvider';
import { SupabaseMovieProvider } from './providers/SupabaseMovieProvider';
import type { IMovieProvider, Movie, MovieDetail } from '@types/movie';

// Lựa chọn provider dựa trên biến môi trường ENV. 
const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'local';

let movieProvider: IMovieProvider;

if (providerType === 'supabase') {
  movieProvider = new SupabaseMovieProvider();
} else {
  movieProvider = new LocalMovieProvider();
}

// Memory Cache đơn giản để lưu trữ kết quả truy vấn, tránh gọi đi gọi lại API ngoài
const movieCache = {
  store: new Map<string, { data: any; expires: number }>(),

  get(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    return item.data;
  },

  set(key: string, data: any, ttlMs: number) {
    this.store.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  },

  clear() {
    this.store.clear();
  }
};

export const MovieService = {
  getMovies: async (params?: { type?: 'movie' | 'series' | 'hoathinh' | 'tvshows', category?: string, limit?: number, sortBy?: string, slugs?: string[] }) => {
    const cacheKey = `list_${JSON.stringify(params || {})}`;
    const cached = movieCache.get(cacheKey);
    if (cached) return cached;

    const data = await movieProvider.getMovies(params);
    // Cache danh sách trong 2 phút
    movieCache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  },

  getMovieBySlug: async (slug: string) => {
    if (!slug || slug === 'undefined' || slug === 'null') return null;

    const cacheKey = `detail_${slug}`;
    const cached = movieCache.get(cacheKey);
    if (cached) return cached;

    const data = await movieProvider.getMovieBySlug(slug);
    if (data) {
      // Cache chi tiết phim trong 10 phút
      movieCache.set(cacheKey, data, 10 * 60 * 1000);
    }
    return data;
  },

  getRelatedMovies: async (id: string) => {
    const cacheKey = `related_${id}`;
    const cached = movieCache.get(cacheKey);
    if (cached) return cached;

    const data = await movieProvider.getRelatedMovies(id);
    if (data) {
      // Cache phim liên quan trong 10 phút
      movieCache.set(cacheKey, data, 10 * 60 * 1000);
    }
    return data;
  },

  searchMovies: async (query: string) => {
    const trimmedQuery = (query || '').trim().toLowerCase();
    if (!trimmedQuery) return [];

    const cacheKey = `search_${trimmedQuery}`;
    const cached = movieCache.get(cacheKey);
    if (cached) return cached;

    const data = await movieProvider.searchMovies(query);
    // Cache kết quả tìm kiếm trong 5 phút
    movieCache.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  },

  getGenresAndCountries: async () => {
    const cacheKey = 'genres_countries';
    const cached = movieCache.get(cacheKey);
    if (cached) return cached;

    let countries: string[] = ["Trung Quốc", "Hàn Quốc", "Nhật Bản", "Mỹ", "Hồng Kông", "Đài Loan", "Thái Lan", "Âu Mỹ", "Việt Nam"];
    let genres: string[] = ["Hành Động", "Viễn Tưởng", "Kinh Dị", "Tình Cảm", "Hài Hước", "Cổ Trang", "Võ Thuật", "Hình Sự", "Phiêu Lưu", "Tâm Lý", "Học Đường", "Chính Kịch", "Gia Đình", "Chiến Tranh", "Hoạt Hình"];

    try {
      // 1. Gọi API phimapi.com lấy danh sách thể loại và quốc gia
      const [genresRes, countriesRes] = await Promise.all([
        fetch('https://phimapi.com/the-loai').then(r => r.ok ? r.json() : null),
        fetch('https://phimapi.com/quoc-gia').then(r => r.ok ? r.json() : null)
      ]);

      if (genresRes && Array.isArray(genresRes)) {
        genres = genresRes.map((g: any) => g.name);
      }
      if (countriesRes && Array.isArray(countriesRes)) {
        countries = countriesRes.map((c: any) => c.name);
      }

      // 2. Kết hợp thêm thể loại trong database
      if (providerType === 'supabase') {
        const { supabase } = await import('@lib/supabase');
        const { data, error } = await supabase
          .from('movies')
          .select('genres');
        
        if (!error && data) {
          const dbGenres = [...new Set(data.flatMap((m: any) => m.genres || []).filter(Boolean))] as string[];
          if (dbGenres.length > 0) {
            genres = [...new Set([...genres, ...dbGenres])];
          }
        }
      }
    } catch (e) {
      console.warn("Lỗi khi lấy genres/countries từ API/database, dùng static fallback:", e);
    }

    const result = { countries, genres };
    // Cache trong 2 giờ
    movieCache.set(cacheKey, result, 2 * 60 * 60 * 1000);
    return result;
  },

  // Helper để xóa cache khi admin cào phim mới hoặc đồng bộ
  clearCache: () => {
    movieCache.clear();
  }
};

