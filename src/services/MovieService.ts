import { LocalMovieProvider } from './providers/LocalMovieProvider';
import { SupabaseMovieProvider } from './providers/SupabaseMovieProvider';
import type { IMovieProvider, Movie, MovieDetail } from '../types/movie';

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
  getMovies: async (params?: { type?: 'movie' | 'series' | 'hoathinh' | 'tvshows', category?: string, limit?: number, sortBy?: string }) => {
    const cacheKey = `list_${JSON.stringify(params || {})}`;
    const cached = movieCache.get(cacheKey);
    if (cached) return cached;

    const data = await movieProvider.getMovies(params);
    // Cache danh sách trong 2 phút
    movieCache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  },

  getMovieBySlug: async (slug: string) => {
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

  // Helper để xóa cache khi admin cào phim mới hoặc đồng bộ
  clearCache: () => {
    movieCache.clear();
  }
};

