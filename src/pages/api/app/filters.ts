import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    data: {
      categories: [
        { name: "Hành Động", slug: "hanh-dong" }
      ],
      regions: [
        { name: "Nhật Bản", slug: "nhat-ban" }
      ],
      years: [ "2026", "2025", "2024" ]
    }
  });
};
