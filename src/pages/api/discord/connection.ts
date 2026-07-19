import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { SettingService } from '@services/SettingService';

async function verifyBotRequest(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  const settings = await SettingService.getSettings();
  const configuredApiKey = settings.discord?.api_key || 'txa-discord-secure-key-2026';
  return token === configuredApiKey;
}

export const GET: APIRoute = async ({ request, url, cookies }) => {
  try {
    const isBot = await verifyBotRequest(request);
    
    if (isBot) {
      // 1. Luồng xử lý cho Bot Discord (Truy vấn theo discordId hoặc cấu hình chung)
      const discordId = url.searchParams.get('discordId');
      if (!discordId) {
        const settings = await SettingService.getSettings();
        return apiResponse({ config: settings.discord || {} }, 'success', 'Lấy cấu hình thành công', 200, request);
      }

      const { data: connection, error: connError } = await supabase
        .from('txa_discord_connections')
        .select('user_id, discord_username')
        .eq('discord_id', discordId)
        .maybeSingle();

      if (connError) throw connError;
      if (!connection) {
        return apiResponse({ connected: false, user: null }, 'success', 'Chưa liên kết', 200, request);
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, email, name, package, expiry_date')
        .eq('id', connection.user_id)
        .maybeSingle();

      if (userError || !user) {
        return apiResponse({ connected: false, user: null }, 'success', 'Không tìm thấy user liên kết', 200, request);
      }

      const { data: stats } = await supabase
        .from('txa_user_activity_stats')
        .select('level, total_watch_seconds, total_ratings, total_comments, discord_message_count')
        .eq('user_id', user.id)
        .maybeSingle();

      const { count: favoritesCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const settings = await SettingService.getSettings();
      const packagesList = settings.packages || [];
      const userPkg = packagesList.find((p: any) => p.id?.toLowerCase() === (user.package || 'free').toLowerCase() || p.title?.toLowerCase() === (user.package || 'free').toLowerCase());
      const packageTitle = userPkg ? userPkg.title : (user.package ? (user.package.charAt(0).toUpperCase() + user.package.slice(1)) : 'Gói Free');

      return apiResponse({
        connected: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          package: user.package || 'free',
          packageTitle: packageTitle,
          expiryDate: user.expiry_date,
          level: stats?.level || 'Mầm Non',
          watchTime: stats?.total_watch_seconds || 0,
          ratingsCount: stats?.total_ratings || 0,
          commentsCount: stats?.total_comments || 0,
          discordMessageCount: stats?.discord_message_count || 0,
          favoritesCount: favoritesCount || 0
        }
      }, 'success', 'Lấy thông tin thành công', 200, request);
    } else {
      // 2. Luồng xử lý cho Client-side Browser (Truy vấn trạng thái liên kết của User hiện tại)
      const user = await verifyUserFromRequest(request, cookies);
      if (!user) {
        return apiResponse(null, 'error', 'Unauthorized', 401, request);
      }

      const { data: connection, error: connError } = await supabase
        .from('txa_discord_connections')
        .select('discord_id, discord_username, discord_avatar, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (connError) throw connError;

      if (!connection) {
        return apiResponse({ connected: false, connection: null }, 'success', 'Chưa liên kết Discord', 200, request);
      }

      const { data: stats } = await supabase
        .from('txa_user_activity_stats')
        .select('level, total_watch_seconds, total_ratings, total_comments, discord_message_count')
        .eq('user_id', user.id)
        .maybeSingle();

      const { count: favoritesCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return apiResponse({
        connected: true,
        connection: {
          discordId: connection.discord_id,
          username: connection.discord_username,
          avatar: connection.discord_avatar,
          createdAt: connection.created_at,
          level: stats?.level || 'Mầm Non',
          watchTime: stats?.total_watch_seconds || 0,
          ratingsCount: stats?.total_ratings || 0,
          commentsCount: stats?.total_comments || 0,
          discordMessageCount: stats?.discord_message_count || 0,
          favoritesCount: favoritesCount || 0
        }
      }, 'success', 'Lấy thông tin kết nối thành công', 200, request);
    }
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const isBot = await verifyBotRequest(request);
    if (!isBot) {
      return apiResponse(null, 'error', 'Unauthorized', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return apiResponse(null, 'error', 'Invalid JSON body', 400, request);
    }

    if (!body || !body.config) {
      return apiResponse(null, 'error', 'Thiếu tham số config trong body', 400, request);
    }

    // Lấy cài đặt settings hiện tại
    const settings = await SettingService.getSettings();
    if (!settings.discord) {
      settings.discord = {};
    }

    // Gộp thông tin cấu hình từ Bot vào settings.discord
    settings.discord.channels = {
      ...(settings.discord.channels || {}),
      ...(body.config.channels || {})
    };
    settings.discord.roles = {
      ...(settings.discord.roles || {}),
      ...(body.config.roles || {})
    };
    settings.discord.schedule = {
      ...(settings.discord.schedule || {}),
      ...(body.config.schedule || {})
    };
    settings.discord.is_setup_completed = true;

    // Lưu lại lên CSDL Supabase
    await SettingService.updateSettings(settings);

    return apiResponse({ success: true }, 'success', 'Đồng bộ cấu hình bot lên website thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
