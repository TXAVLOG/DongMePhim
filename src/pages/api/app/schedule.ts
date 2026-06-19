import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    data: [
      {
        date: "2026-06-21",
        movies: [
          {
            id: 1024,
            name: "Đảo Hải Tặc",
            slug: "one-piece",
            thumb_url: "https://img.dongmephim.online/one-piece-thumb.jpg",
            poster_url: "https://img.dongmephim.online/one-piece-poster.jpg",
            type: "series",
            next_episode_name: "Tập 1136",
            episode_current: "Tập 1135",
            broadcast_time: "09:30",
            quality: "FHD"
          }
        ]
      }
    ]
  });
};
