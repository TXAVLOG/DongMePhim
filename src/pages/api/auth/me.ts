import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async () => {
  return apiResponse({
    data: {
      id: 888,
      name: "User Name",
      email: "user@gmail.com",
      avatar: "https://img.dongmephim.online/avatars/user.jpg"
    }
  });
};
