import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    data: {
      favorite_ids: [124, 255, 1022], 
      featured: [
        {
          id: 1024,
          name: "Đảo Hải Tặc",
          origin_name: "One Piece",
          slug: "one-piece",
          thumb_url: "https://img.dongmephim.online/one-piece-thumb.jpg",
          poster_url: "https://img.dongmephim.online/one-piece-poster.jpg",
          type: "series",
          episode_current: "Tập 1135",
          quality: "FHD",
          lang: "Vietsub",
          year: 1999,
          time: "24 phút/tập",
          content: "Hành trình tìm kiếm kho báu One Piece...",
          imdb: { vote_average: 9.0 },
          tmdb: { vote_average: 8.9 }
        }
      ],
      categories: [
        { name: "Hành Động", slug: "hanh-dong", count: 142 },
        { name: "Cổ Trang", slug: "co-trang", count: 95 }
      ],
      TXA_NEW1: {
        title: "Mới cập nhật",
        data: [
          {
            id: 2048,
            name: "Phim Mới Cập Nhật",
            origin_name: "New Movie",
            slug: "new-movie",
            thumb_url: "https://img.dongmephim.online/thumb.jpg",
            poster_url: "https://img.dongmephim.online/poster.jpg",
            type: "single",
            episode_current: "Full",
            quality: "FHD",
            lang: "Thuyết Minh",
            year: 2026,
            time: "120 phút",
            is_favorite: false
          }
        ]
      },
      TXA_HOT1: { title: "Phim Hot", data: [] },
      TXA_HH1: { title: "Anime & Hoạt Hình", data: [] },
      TXA_PB1: { title: "Phim Bộ", data: [] },
      TXA_PL1: { title: "Phim Lẻ", data: [] },
      TXA_TV1: { title: "TV Shows", data: [] },
      TXA_CR1: { title: "Phim Chiếu Rạp", data: [] }
    }
  });
};
