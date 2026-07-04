import { LocalMovieProvider } from './providers/LocalMovieProvider';
import { SupabaseMovieProvider } from './providers/SupabaseMovieProvider';
import type { IMovieProvider, Movie, MovieDetail } from '@apptypes/movie';
import { getHomepageCategories } from '../data/categories';

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

    // Nếu lọc theo category, kiểm tra xem admin có cấu hình thủ công trong homepage_categories không
    if (params?.category) {
      try {
        const homepageMappings = await getHomepageCategories();
        const category = params.category;

        // Bộ ánh xạ bí danh cho các danh mục trang chủ đề phòng sự bất nhất giữa param API và slug cấu hình
        const categoryAliases: Record<string, string> = {
          'than-thoai': 'huyen-thoai-co-tich',
          'huyen-thoai-co-tich': 'than-thoai',
          'hoc-duong': 'thanh-xuan-hoc-duong',
          'thanh-xuan-hoc-duong': 'hoc-duong',
          'thanh-xuan-vuon-truong': 'thanh-xuan-hoc-duong',
          'chau-tinh-tri': 'chau-tinh-tri-xem-la-cuoi',
          'chau-tinh-tri-xem-la-cuoi': 'chau-tinh-tri'
        };

        const targetKey = homepageMappings[category] ? category : (categoryAliases[category] || category);
        const configuredSlugs = homepageMappings[targetKey];

        if (configuredSlugs && Array.isArray(configuredSlugs) && configuredSlugs.length > 0) {
          // Lấy danh sách phim theo đúng các slugs được cấu hình
          const movies = await movieProvider.getMovies({ slugs: configuredSlugs });
          // Sắp xếp phim theo đúng thứ tự mà admin đã kéo thả
          movies.sort((a, b) => configuredSlugs.indexOf(a.slug) - configuredSlugs.indexOf(b.slug));

          let result = movies;
          if (params.limit) {
            result = result.slice(0, params.limit);
          }
          movieCache.set(cacheKey, result, 2 * 60 * 1000);
          return result;
        }
      } catch (err) {
        console.error('Lỗi khi lấy phim theo cấu hình danh mục trang chủ:', err);
      }
    }

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
    const cacheKey = 'genres_countries_merged';
    const cached = movieCache.get(cacheKey);
    if (cached) return cached;

    let countries = [
      "Trung Quốc", "Hàn Quốc", "Nhật Bản", "Mỹ", "Hồng Kông", "Đài Loan", "Thái Lan", "Âu Mỹ", "Việt Nam", 
      "Ấn Độ", "Anh", "Pháp", "Đức", "Ý", "Tây Ban Nha", "Nga", "Canada", "Úc", "Brazil", "Mexico", 
      "Indonesia", "Malaysia", "Singapore", "Philippines", "Thổ Nhĩ Kỳ"
    ];
    let genres = [
      "Hành Động", "Phiêu Lưu", "Viễn Tưởng", "Kinh Dị", "Tình Cảm", "Hài Hước", "Cổ Trang", "Võ Thuật", 
      "Hình Sự", "Tội Phạm", "Bí Ẩn", "Giật Gân", "Tâm Lý", "Học Đường", "Chính Kịch", "Gia Đình", 
      "Chiến Tranh", "Hoạt Hình", "Âm Nhạc", "Thể Thao", "Tài Liệu", "Lịch Sử", "Viễn Tây", "Thần Thoại"
    ];

    try {
      if (providerType === 'supabase') {
        const { supabase } = await import('@lib/supabase');
        const [genresRes, countriesRes] = await Promise.all([
          supabase.from('genres').select('name'),
          supabase.from('countries').select('name')
        ]);
        
        if (genresRes.data) {
          const dbGenres = genresRes.data.map((g: any) => g.name).filter(Boolean);
          if (dbGenres.length > 0) {
            genres = [...new Set([...genres, ...dbGenres])];
          }
        }
        if (countriesRes.data) {
          const dbCountries = countriesRes.data.map((c: any) => c.name).filter(Boolean);
          if (dbCountries.length > 0) {
            countries = [...new Set([...countries, ...dbCountries])];
          }
        }
      }
    } catch (e) {
      console.warn("Lỗi khi đọc genres/countries từ DB:", e);
    }

    const result = { countries, genres };
    // Cache kết quả hợp nhất trong 1 giờ
    movieCache.set(cacheKey, result, 60 * 60 * 1000);
    return result;
  },

  // Helper để xóa cache khi admin cào phim mới hoặc đồng bộ
  clearCache: () => {
    movieCache.clear();
  }
};

