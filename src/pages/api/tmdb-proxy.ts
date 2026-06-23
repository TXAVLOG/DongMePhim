import type { APIRoute } from 'astro';
import { SettingService } from '@services/SettingService';

export const ALL: APIRoute = async ({ request, url }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    });
  }

  const path = url.searchParams.get('path');
  if (!path) {
    return new Response(JSON.stringify({ error: 'Thiếu tham số path' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const settings = await SettingService.getSettings();
    const apiKey = (settings.general as any).tmdb_api_key || '211be8d45c0d31404f644ecdcf9caad5';

    // Dùng api.tmdb.org (domain phụ tránh bị chặn DNS tại VN)
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const tmdbUrl = new URL(`https://api.tmdb.org${cleanPath}`);

    // Chuyển tiếp toàn bộ query params ngoại trừ 'path'
    url.searchParams.forEach((value, key) => {
      if (key !== 'path') {
        tmdbUrl.searchParams.set(key, value);
      }
    });

    // Đảm bảo api_key được thêm vào
    if (!tmdbUrl.searchParams.has('api_key')) {
      tmdbUrl.searchParams.set('api_key', apiKey);
    }

    const res = await fetch(tmdbUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    });
  } catch (error: any) {
    console.error('TMDB Proxy Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Lỗi TMDB Proxy' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
