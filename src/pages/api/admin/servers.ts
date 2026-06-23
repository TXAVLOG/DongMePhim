import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  try {
    const servers = new Set<string>();
    servers.add("DongMePhim VIP"); // Luôn đảm bảo có DongMePhim VIP

    // 1. Lấy từ Supabase
    const { data: movies, error } = await supabase
      .from('movies')
      .select('episodes');

    if (!error && movies) {
      movies.forEach((m: any) => {
        if (Array.isArray(m.episodes)) {
          m.episodes.forEach((server: any) => {
            const name = server.serverName || server.server_name;
            if (name) servers.add(name);
          });
        }
      });
    }

    // 2. Fallback thêm các server mặc định khác
    const defaultServers = ["FPT Fast", "Vietsub", "Thuyết Minh", "Lồng Tiếng"];
    defaultServers.forEach(srv => servers.add(srv));

    return apiResponse(Array.from(servers), 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(["DongMePhim VIP", "FPT Fast", "Vietsub", "Thuyết Minh", "Lồng Tiếng"], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
