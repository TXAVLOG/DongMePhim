import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';

export const POST: APIRoute = async ({ request }) => {
  return apiResponse({ success: true }, 'success', '', 200, request, true);
};
