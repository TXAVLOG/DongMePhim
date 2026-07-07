import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';

// Helper function để lấy toàn bộ danh sách phim vượt giới hạn 1000 dòng của Supabase
async function fetchAllMoviesEpisodes(selectFields: string = 'episodes') {
  let allMovies: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('movies')
      .select(selectFields)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(`Lỗi fetch movies range (${selectFields}):`, error);
      hasMore = false;
    } else if (data && data.length > 0) {
      allMovies = allMovies.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }
  return allMovies;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    // 1. Lấy danh sách server được cấu hình từ bảng settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'servers')
      .maybeSingle();

    let configuredServers: string[] = [];
    if (!settingsError && settingsData && Array.isArray(settingsData.value)) {
      configuredServers = settingsData.value;
    } else {
      configuredServers = ["DongMePhim VIP", "FPT Fast", "Vietsub", "Thuyết Minh", "Lồng Tiếng"];
    }

    // 2. Thống kê số lượng phim sử dụng mỗi server
    const movies = await fetchAllMoviesEpisodes('episodes');

    const movieCounts: Record<string, number> = {};
    movies.forEach((m: any) => {
      if (Array.isArray(m.episodes)) {
        const movieServers = new Set<string>();
        m.episodes.forEach((server: any) => {
          const name = server.serverName || server.server_name;
          if (name) movieServers.add(name);
        });
        movieServers.forEach(name => {
          movieCounts[name] = (movieCounts[name] || 0) + 1;
        });
      }
    });

    // 3. Hợp nhất danh sách server cấu hình và các server thực tế trong database
    const resultList: { name: string; movieCount: number }[] = [];
    const addedNames = new Set<string>();

    configuredServers.forEach(name => {
      if (!addedNames.has(name)) {
        resultList.push({
          name,
          movieCount: movieCounts[name] || 0
        });
        addedNames.add(name);
      }
    });

    Object.keys(movieCounts).forEach(name => {
      if (!addedNames.has(name)) {
        resultList.push({
          name,
          movieCount: movieCounts[name] || 0
        });
        addedNames.add(name);
      }
    });

    return apiResponse(resultList, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { action, name, oldName, newName, deleteFromMovies } = body;

    // Lấy cấu hình hiện tại
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'servers')
      .maybeSingle();

    let configuredServers: string[] = [];
    if (!settingsError && settingsData && Array.isArray(settingsData.value)) {
      configuredServers = settingsData.value;
    } else {
      configuredServers = ["DongMePhim VIP", "FPT Fast", "Vietsub", "Thuyết Minh", "Lồng Tiếng"];
    }

    if (action === 'create' && name) {
      const trimmedName = name.trim();
      if (!configuredServers.includes(trimmedName)) {
        configuredServers.push(trimmedName);
      }
    } else if (action === 'update' && oldName && newName) {
      const trimmedOld = oldName.trim();
      const trimmedNew = newName.trim();
      
      configuredServers = configuredServers.map(s => s === trimmedOld ? trimmedNew : s);

      // Cập nhật tên server trong toàn bộ phim ở cơ sở dữ liệu
      const movies = await fetchAllMoviesEpisodes('id, episodes');

      for (const movie of movies) {
        if (Array.isArray(movie.episodes)) {
          let updated = false;
          const newEpisodes = movie.episodes.map((ep: any) => {
            const sName = ep.serverName || ep.server_name;
            if (sName === trimmedOld) {
              updated = true;
              return {
                ...ep,
                serverName: trimmedNew,
                server_name: trimmedNew
              };
            }
            return ep;
          });

          if (updated) {
            await supabase
              .from('movies')
              .update({ episodes: newEpisodes })
              .eq('id', movie.id);
          }
        }
      }
    } else if (action === 'delete' && name) {
      const trimmedName = name.trim();
      configuredServers = configuredServers.filter(s => s !== trimmedName);

      // Nếu người dùng chọn xóa tập phim trên server này khỏi database
      if (deleteFromMovies) {
        const movies = await fetchAllMoviesEpisodes('id, episodes');

        for (const movie of movies) {
          if (Array.isArray(movie.episodes)) {
            const originalLen = movie.episodes.length;
            const newEpisodes = movie.episodes.filter((ep: any) => {
              const sName = ep.serverName || ep.server_name;
              return sName !== trimmedName;
            });

            if (newEpisodes.length !== originalLen) {
              await supabase
                .from('movies')
                .update({ episodes: newEpisodes })
                .eq('id', movie.id);
            }
          }
        }
      }
    } else {
      return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
    }

    // Lưu lại vào bảng settings
    const { error: upsertError } = await supabase
      .from('settings')
      .upsert({
        key: 'servers',
        value: configuredServers,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (upsertError) {
      throw upsertError;
    }

    // Xóa cache
    SettingService.clearCache();

    return apiResponse({ success: true, servers: configuredServers }, 'success', 'Cập nhật server thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

