import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    unread_count: 2,
    data: [
      {
        id: "notif_001",
        title: "Tập mới phát sóng",
        body: "One Piece tập 1135 đã có mặt trên hệ thống. Xem ngay!",
        image_url: "https://img.dongmephim.online/one-piece-thumb.jpg",
        is_read: false,
        created_at: "2026-06-18T09:30:00Z"
      }
    ]
  });
};
