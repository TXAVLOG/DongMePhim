import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { MovieService } from '@services/MovieService';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { TxaMovieRanker } from '../../../backend/utils/txaMovieRanker';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Get user favorite IDs if logged in
    let favoriteIds: number[] = [];
    const user = await verifyUserFromRequest(request, cookies);
    if (user) {
      const { data: favs } = await supabase
        .from('watch_lists')
        .select('movie_id')
        .eq('user_id', user.id);
      
      if (favs && favs.length > 0) {
        const { data: favMovies } = await supabase
          .from('movies')
          .select('movie_id_seq')
          .in('id', favs.map((f: any) => f.movie_id));
        
        if (favMovies) {
          favoriteIds = favMovies
            .map((m: any) => parseInt(m.movie_id_seq, 10))
            .filter(Boolean);
        }
      }
    }

    // 2. Fetch movies (limit to 120 for homepage sections)
    const allMovies = await MovieService.getMovies({ limit: 120, sortBy: 'updatedAt' });

    // Helper map function
    const mapMovie = (m: any) => {
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
        time: m.durationMinutes || m.duration_minutes || "",
        content: m.description || "",
        imdb: { vote_average: parseFloat(m.imdbScore || m.imdb_score) || 0 },
        tmdb: { vote_average: parseFloat(m.tmdbScore || m.tmdb_score || m.imdbScore || m.imdb_score) || 0 },
        is_favorite: favoriteIds.includes(Number(seqId)),
        require_login: m.require_login || false
      };
    };

    // 3. Filter sections
    const featured = allMovies.filter((m: any) => m.pinned === true || m.pinned === 'true' || m.pinned === 1).slice(0, 5);
    const featuredList = featured.length > 0 ? featured.map(mapMovie) : [...allMovies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map(mapMovie);

    const categories = [
      { name: "Hành Động", slug: "hanh-dong", count: 142 },
      { name: "Cổ Trang", slug: "co-trang", count: 95 },
      { name: "Viễn Tưởng", slug: "vien-tuong", count: 70 },
      { name: "Kinh Dị", slug: "kinh-di", count: 54 },
      { name: "Tình Cảm", slug: "tinh-cam", count: 88 },
      { name: "Hài Hước", slug: "hai-huoc", count: 62 },
      { name: "Hoạt Hình", slug: "hoat-hinh", count: 110 }
    ];

    // Mới cập nhật (Latest)
    const latestList = [...allMovies].slice(0, 15).map(mapMovie);

    // Phim Hot (Sorted by views)
    const hotList = [...allMovies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 15).map(mapMovie);

    // Anime (type hoathinh or genre Hoạt Hình)
    const animeFiltered = allMovies.filter((m: any) => m.type === 'hoathinh' || (m.genres && m.genres.some((g: string) => g.toLowerCase().includes('hoạt hình'))));
    const animeList = TxaMovieRanker.sortMovies(animeFiltered).slice(0, 15).map(mapMovie);

    // Phim Bộ (type series)
    const seriesFiltered = allMovies.filter((m: any) => m.type === 'series');
    const seriesList = TxaMovieRanker.sortMovies(seriesFiltered).slice(0, 15).map(mapMovie);

    // Phim Lẻ (type movie)
    const singleFiltered = allMovies.filter((m: any) => m.type === 'movie');
    const singleList = TxaMovieRanker.sortMovies(singleFiltered).slice(0, 15).map(mapMovie);

    // TV Shows (type tvshows)
    const tvshowsList = allMovies.filter((m: any) => m.type === 'tvshows').slice(0, 15).map(mapMovie);

    // Phim Chiếu Rạp (genres contains 'Chiếu Rạp')
    const theaterList = allMovies.filter((m: any) => m.genres && m.genres.some((g: string) => g.toLowerCase().includes('chiếu rạp'))).slice(0, 15).map(mapMovie);

    return apiResponse({
      favorite_ids: favoriteIds,
      featured: featuredList,
      categories,
      TXA_NEW1: {
        title: "TXA_NEW1",
        data: latestList
      },
      TXA_HOT1: {
        title: "TXA_HOT1",
        data: hotList
      },
      TXA_HH1: {
        title: "TXA_HH1",
        data: animeList
      },
      TXA_PB1: {
        title: "TXA_PB1",
        data: seriesList
      },
      TXA_PL1: {
        title: "TXA_PL1",
        data: singleList
      },
      TXA_TV1: {
        title: "TXA_TV1",
        data: tvshowsList
      },
      TXA_CR1: {
        title: "TXA_CR1",
        data: theaterList
      }
    }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
