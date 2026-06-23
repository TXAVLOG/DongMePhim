import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';

export const GET: APIRoute = async ({ params }) => {
  return apiResponse({
    data: {
      link: "https://stream.dongmephim.online/hls/ep1135/index.m3u8",
      link_m3u8: "https://stream.dongmephim.online/hls/ep1135/index.m3u8"
    }
  });
};
