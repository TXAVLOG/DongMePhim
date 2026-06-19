import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    data: [
      {
        version: "4.6.0",
        date: "2026-06-18",
        content: "Cập nhật tính năng tải ngoại tuyến mượt hơn."
      }
    ]
  });
};
