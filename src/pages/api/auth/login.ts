import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const POST: APIRoute = async () => {
  return apiResponse({
    access_token: "eyJhbGciOiJIUzI1NiIsIn...",
    token_type: "Bearer",
    expires_in: 31536000
  });
};
