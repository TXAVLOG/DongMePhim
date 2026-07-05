import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
import { verifyUserFromRequest } from '@lib/auth';

export const GET: APIRoute = async ({ params, request }) => {
  const { episodeId } = params;
  if (!episodeId) {
    return apiResponse(null, 'error', 'Missing episodeId parameter', 400, request);
  }

  try {
    // Search movies containing this episode slug in JSONB column 'episodes'
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, episodes')
      .filter('episodes', 'cs', `[{"serverData": [{"slug": "${episodeId}"}]}]`);

    if (error) {
      throw error;
    }

    if (!movies || movies.length === 0) {
      return apiResponse(null, 'error', 'Episode not found', 404, request);
    }

    // Find the episode details inside the matched movie episodes JSON
    let matchedEpisode: any = null;
    let matchedServerName = '';
    for (const movie of movies) {
      const episodesList = movie.episodes || [];
      for (const server of episodesList) {
        const srvData = server.serverData || server.server_data || [];
        const found = srvData.find((e: any) => e.slug === episodeId);
        if (found) {
          matchedEpisode = found;
          matchedServerName = server.serverName;
          break;
        }
      }
      if (matchedEpisode) break;
    }

    if (!matchedEpisode) {
      return apiResponse(null, 'error', 'Episode data not found', 404, request);
    }

    // Perform authentication and subscription verification
    let userPkgId = 'free';
    let isAdmin = false;
    let allowedServers: string[] = [];

    const settings = await SettingService.getSettings();
    const cookies = {
      get: (name: string) => {
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
        return match ? { value: decodeURIComponent(match[2]) } : undefined;
      }
    } as any;

    try {
      const user = await verifyUserFromRequest(request, cookies);
      if (user) {
        userPkgId = user.package || 'free';
        isAdmin = user.role === 'admin';

        const packagesList = settings.packages || [];
        const userPkg = packagesList.find((p: any) => 
          (p.id || '').toLowerCase() === userPkgId.toLowerCase() || 
          (p.title || '').toLowerCase() === userPkgId.toLowerCase()
        ) || packagesList.find((p: any) => (p.id || '').toLowerCase() === 'free');
        
        const userPrice = userPkg?.price || 0;
        allowedServers = userPkg?.permissions?.allowed_servers || [];
        packagesList.forEach((p: any) => {
          if (p.price <= userPrice && p.permissions?.allowed_servers) {
            p.permissions.allowed_servers.forEach((srv: string) => {
              if (!allowedServers.includes(srv)) {
                allowedServers.push(srv);
              }
            });
          }
        });
      }
    } catch (_) {}

    if (allowedServers.length === 0) {
      const packagesList = settings.packages || [];
      const freePkg = packagesList.find((p: any) => p.id === 'free');
      allowedServers = freePkg?.permissions?.allowed_servers || ["Vietsub", "Thuyết Minh", "Lồng Tiếng"];
    }

    const isServerLocked = !isAdmin && !allowedServers.some((s: string) => s.toLowerCase() === matchedServerName.toLowerCase());
    if (isServerLocked) {
      return apiResponse(null, 'error', 'Nguồn phát VIP giới hạn. Vui lòng nâng cấp gói để xem!', 403, request);
    }

    const responsePayload = {
      link: matchedEpisode.linkM3u8 || matchedEpisode.linkEmbed || "",
      link_m3u8: matchedEpisode.linkM3u8 || "",
      link_embed: matchedEpisode.linkEmbed || ""
    };

    return apiResponse(responsePayload, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
