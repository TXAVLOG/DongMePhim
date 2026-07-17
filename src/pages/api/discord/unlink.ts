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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let userId: string | null = null;
    let discordId: string | null = null;

    const isBot = await verifyBotRequest(request);

    if (isBot) {
      // 1. Luồng xử lý gọi từ Bot Discord
      let body: any = {};
      try {
        body = await request.json();
      } catch (e) {}

      discordId = body.discordId;
      if (!discordId) {
        return apiResponse(null, 'error', 'Thiếu tham số discordId trong body', 400, request);
      }

      // Lấy user_id tương ứng từ database
      const { data: connection } = await supabase
        .from('txa_discord_connections')
        .select('user_id')
        .eq('discord_id', discordId)
        .maybeSingle();

      if (!connection) {
        return apiResponse(null, 'error', 'Không tìm thấy liên kết của tài khoản Discord này!', 404, request);
      }
      userId = connection.user_id;
    } else {
      // 2. Luồng xử lý gọi từ Web Browser
      const user = await verifyUserFromRequest(request, cookies);
      if (!user) {
        return apiResponse(null, 'error', 'Chưa đăng nhập', 401, request);
      }
      userId = user.id;

      const { data: connection } = await supabase
        .from('txa_discord_connections')
        .select('discord_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!connection) {
        return apiResponse(null, 'error', 'Bạn chưa liên kết tài khoản Discord nào!', 404, request);
      }
      discordId = connection.discord_id;
    }

    // 3. Xóa liên kết khỏi database Supabase
    const { error: deleteError } = await supabase
      .from('txa_discord_connections')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw deleteError;
    }

    // 4. Thu hồi toàn bộ vai trò đặc quyền của thành viên trên Discord Server
    const settings = await SettingService.getSettings();
    const discord = settings.discord;

    if (discord && discord.bot_token && discord.guild_id) {
      const headers = {
        'Authorization': `Bot ${discord.bot_token}`,
        'Content-Type': 'application/json'
      };

      const rolesToRemove = [
        discord.role_member,
        discord.role_level_mam_non,
        discord.role_level_mot_phim,
        discord.role_level_cuong_phim,
        discord.role_level_truong_lao,
        discord.role_top_1_month,
        discord.role_top_1_consecutive,
        discord.role_package_vip,
        discord.role_package_standard,
        discord.role_package_bypass_zalo
      ].filter(Boolean) as string[];

      // Gỡ vai trò
      for (const roleId of rolesToRemove) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roleId}`, {
            method: 'DELETE',
            headers
          });
        } catch (e) {}
      }

      // Gán lại vai trò Unverified
      if (discord.role_unverified) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${discord.role_unverified}`, {
            method: 'PUT',
            headers
          });
        } catch (e) {}
      }
    }

    return apiResponse({ unlinked: true }, 'success', 'Đã hủy liên kết tài khoản Discord thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
