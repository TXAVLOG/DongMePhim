import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    data: [
      { keyword: "One Piece", clicks: 15200 }
    ]
  });
};
