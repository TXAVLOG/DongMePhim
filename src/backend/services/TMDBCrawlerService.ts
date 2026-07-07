import { SettingService } from './SettingService';

export class TMDBCrawlerService {
  static async searchMovies(keyword: string, limit: number = 40): Promise<any[]> {
    try {
      const settings = await SettingService.getSettings();
      const apiKey = (settings.general as any).tmdb_api_key || '211be8d45c0d31404f644ecdcf9caad5';

      const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(keyword)}&language=vi-VN&page=1`;
      const res = await fetch(searchUrl);
      if (!res.ok) return [];

      const data = await res.json() as any;
      const results = data.results || [];

      // Filter only movies and TV shows
      const moviesAndTV = results.filter((item: any) => 
        item.media_type === 'movie' || item.media_type === 'tv'
      );

      // Map to standard format
      return moviesAndTV.slice(0, limit).map((item: any) => {
        const title = item.title || item.name || '';
        const originalTitle = item.original_title || item.original_name || '';
        const year = item.release_date ? item.release_date.substring(0, 4) : 
                     item.first_air_date ? item.first_air_date.substring(0, 4) : '2024';
        const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
        const backdropPath = item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : '';
        const type = item.media_type === 'tv' ? 'tvshows' : 'single';
        const tmdbId = item.id;
        const tmdbType = item.media_type === 'tv' ? 'tv' : 'movie';

        // Generate slug from title
        const slug = this.generateSlug(title, year);

        return {
          slug,
          name: title,
          origin_name: originalTitle,
          year,
          poster_url: posterPath,
          thumb_url: backdropPath,
          type,
          tmdb: {
            id: tmdbId,
            type: tmdbType
          },
          quality: 'HD',
          episode_current: item.media_type === 'tv' ? 'Đang cập nhật' : 'Full',
          vote_average: item.vote_average
        };
      });
    } catch (error) {
      console.error('Error searching TMDB:', error);
      return [];
    }
  }

  static async getMovieDetail(tmdbId: number, tmdbType: string): Promise<any> {
    try {
      const settings = await SettingService.getSettings();
      const apiKey = (settings.general as any).tmdb_api_key || '211be8d45c0d31404f644ecdcf9caad5';

      const detailUrl = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${apiKey}&language=vi-VN&append_to_response=credits,videos,external_ids`;
      const res = await fetch(detailUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;

      // Map TMDB data to standard movie format
      const title = data.title || data.name || '';
      const originalTitle = data.original_title || data.original_name || '';
      const year = data.release_date ? data.release_date.substring(0, 4) : 
                   data.first_air_date ? data.first_air_date.substring(0, 4) : '2024';
      const posterPath = data.poster_path ? `https://image.tmdb.org/t/p/original${data.poster_path}` : '';
      const backdropPath = data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '';
      const type = tmdbType === 'tv' ? 'tvshows' : 'single';
      const slug = this.generateSlug(title, year);

      // Extract genres
      const genres = (data.genres || []).map((g: any) => g.name).join(', ');

      // Extract cast
      const cast = (data.credits?.cast || []).slice(0, 10).map((c: any) => c.name).join(', ');

      // Extract runtime
      const runtime = data.runtime || (data.episode_run_time?.[0]) || 90;

      // Extract overview
      const content = data.overview || '';

      // Extract episode count for TV shows
      let episodeCurrent = 'Full';
      let totalEpisodes = 0;
      if (tmdbType === 'tv' && data.number_of_seasons) {
        totalEpisodes = data.number_of_episodes || 0;
        episodeCurrent = totalEpisodes > 0 ? `${totalEpisodes} tập` : 'Đang cập nhật';
      }

      // Extract trailer
      const trailer = (data.videos?.results || []).find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      const trailerKey = trailer?.key || '';
      const trailerUrl = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : '';

      // Extract IMDb ID
      const imdbId = data.external_ids?.imdb_id || '';

      return {
        slug,
        title,
        originalTitle,
        origin_name: originalTitle,
        year,
        posterUrl: posterPath,
        bannerUrl: backdropPath,
        type,
        genres: genres ? genres.split(', ') : [],
        content,
        actors: cast ? cast.split(', ') : [],
        durationMinutes: runtime,
        episodeCurrent,
        totalEpisodes,
        tmdb: {
          id: tmdbId,
          type: tmdbType
        },
        imdbId,
        trailerUrl,
        tmdbScore: data.vote_average,
        quality: 'HD',
        country: this.mapTMDBCountryToVietnamese(data),
        category: data.genres?.[0]?.name || 'Khác',
        status: data.status || 'Released',
        seasons: tmdbType === 'tv' ? data.number_of_seasons : 1,
        // Note: TMDB doesn't provide actual streaming links, so episodes will be empty
        episodes: []
      };
    } catch (error) {
      console.error('Error getting TMDB movie detail:', error);
      throw error;
    }
  }

  static mapTMDBCountryToVietnamese(data: any): string {
    const iso = (data.origin_country?.[0] || data.production_countries?.[0]?.iso_3166_1 || '').toUpperCase();
    const name = (data.production_countries?.[0]?.name || '').toLowerCase();

    if (iso === 'KR' || name.includes('korea')) return 'Hàn Quốc';
    if (iso === 'CN' || iso === 'HK' || iso === 'TW' || name.includes('china') || name.includes('hong kong') || name.includes('taiwan')) return 'Trung Quốc';
    if (iso === 'JP' || name.includes('japan')) return 'Nhật Bản';
    if (iso === 'TH' || name.includes('thailand')) return 'Thái Lan';
    if (iso === 'VN' || name.includes('vietnam') || name.includes('viet nam')) return 'Việt Nam';
    if (iso === 'IN' || name.includes('india')) return 'Ấn Độ';
    if (['US', 'GB', 'CA', 'FR', 'DE', 'ES', 'IT', 'AU', 'RU', 'SE', 'NO', 'DK', 'NL', 'PL', 'BR', 'MX'].includes(iso) || name.includes('united states') || name.includes('united kingdom') || name.includes('canada') || name.includes('america')) return 'Âu Mỹ';

    return data.production_countries?.[0]?.name || 'Âu Mỹ';
  }

  static async discoverMovies(options: { genre?: string; country?: string; year?: string; page?: number; limit?: number }): Promise<any[]> {
    try {
      const settings = await SettingService.getSettings();
      const apiKey = (settings.general as any).tmdb_api_key || '211be8d45c0d31404f644ecdcf9caad5';

      const { genre, country, year, page = 1, limit = 40 } = options;
      
      let discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=vi-VN&page=${page}`;
      
      if (genre) {
        discoverUrl += `&with_genres=${genre}`;
      }
      
      if (country) {
        discoverUrl += `&with_origin_country=${country}`;
      }

      if (year) {
        discoverUrl += `&primary_release_year=${year}`;
      }

      const res = await fetch(discoverUrl);
      if (!res.ok) return [];

      const data = await res.json() as any;
      const results = data.results || [];

      // Map to standard format
      return results.slice(0, limit).map((item: any) => {
        const title = item.title || item.name || '';
        const originalTitle = item.original_title || item.original_name || '';
        const year = item.release_date ? item.release_date.substring(0, 4) : 
                     item.first_air_date ? item.first_air_date.substring(0, 4) : '2024';
        const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
        const backdropPath = item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : '';
        const type = 'single';
        const tmdbId = item.id;
        const tmdbType = 'movie';

        // Generate slug from title
        const slug = this.generateSlug(title, year);

        return {
          slug,
          name: title,
          origin_name: originalTitle,
          year,
          poster_url: posterPath,
          thumb_url: backdropPath,
          type,
          tmdb: {
            id: tmdbId,
            type: tmdbType
          },
          quality: 'HD',
          episode_current: 'Full',
          vote_average: item.vote_average
        };
      });
    } catch (error) {
      console.error('Error discovering TMDB movies:', error);
      return [];
    }
  }

  static generateSlug(title: string, year: string): string {
    const cleanTitle = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
    return `${cleanTitle}-${year}`;
  }
}
