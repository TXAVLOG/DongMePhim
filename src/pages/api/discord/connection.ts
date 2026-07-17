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
      // 1. Luồng xử lý cho Bot Discord (Truy vấn theo discordId)
      const discordId = url.searchParams.get('discordId');
      if (!discordId) {
        return apiResponse(null, 'error', 'Thiếu tham số discordId', 400, request);
      }

      const { data: connection, error: connError } = await supabase
        .from('txa_discord_connections')
        .select('user_id, username')
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
        .select('level')
        .eq('user_id', user.id)
        .maybeSingle();

      return apiResponse({
        connected: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          package: user.package || 'free',
          expiryDate: user.expiry_date,
          level: stats?.level || 'Mầm Non'
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
        .select('discord_id, username, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (connError) throw connError;

      if (!connection) {
        return apiResponse({ connected: false, connection: null }, 'success', 'Chưa liên kết Discord', 200, request);
      }

      return apiResponse({
        connected: true,
        connection: {
          discordId: connection.discord_id,
          username: connection.username,
          createdAt: connection.created_at
        }
      }, 'success', 'Lấy thông tin kết nối thành công', 200, request);
    }
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
