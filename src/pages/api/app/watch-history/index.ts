import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    data: [
      {
        movie_id: 1024,
        movie_name: "Đảo Hải Tặc",
        movie_slug: "one-piece",
        movie_thumb: "https://img.dongmephim.online/one-piece-thumb.jpg",
        episode_id: "ep1135",
        episode_name: "Tập 1135",
        current_time: 450.0,
        duration: 1440.0,
        server_index: 0,
        updated_at: "2026-06-18T14:00:00Z"
      }
    ]
  });
};
