import type { APIRoute } from 'astro';
import { apiResponse } from '../../../../lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    data: [
      {
        id: 1024,
        name: "Đảo Hải Tặc",
        slug: "one-piece",
        thumb_url: "https://img.dongmephim.online/one-piece-thumb.jpg",
        poster_url: "https://img.dongmephim.online/one-piece-poster.jpg",
        type: "series",
        episode_current: "Tập 1135",
        quality: "FHD",
        lang: "Vietsub"
      }
    ],
    pagination: {
      total: 120,
      per_page: 20,
      current_page: 1,
      last_page: 6
    }
  });
};
