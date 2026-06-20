import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    data: {
      id: 888,
      name: "DongMePhim User",
      email: "abc@gmail.com",
      avatar: "/logo-decoy.png"
    }
  });
};
