import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { TxaJsonDb } from '@services/TxaJsonDb';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Chưa đăng nhập', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { movieTitle, movieSlug, episodeName } = body;
    if (!movieTitle || !movieSlug || !episodeName) {
      return apiResponse(null, 'error', 'Thiếu tham số', 400, request);
    }

    // 1. Kiểm tra liên kết từ Supabase
    const { data: connection, error: connError } = await supabase
      .from('txa_discord_connections')
      .select('discord_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (connError || !connection) {
      return apiResponse({ sent: false, reason: 'Chưa liên kết Discord' }, 'success', '', 200, request);
    }

    // 2. Lấy cấu hình credentials từ database và kênh hệ thống từ config.json local
    const settings = await SettingService.getSettings();
    const discord = settings.discord;

    if (!discord || !discord.bot_token) {
      return apiResponse({ sent: false, reason: 'Chưa cấu hình Bot Token' }, 'success', '', 200, request);
    }

    const localConfig = TxaJsonDb.getDiscordConfig();
    const channelDangXem = localConfig.channels.dang_xem;

    if (!channelDangXem) {
      return apiResponse({ sent: false, reason: 'Chưa cấu hình kênh đang xem (#dang-xem)' }, 'success', '', 200, request);
    }

    // 3. Gửi tin nhắn trạng thái lên Discord
    const discordId = connection.discord_id;
    const siteUrl = (settings.general?.site_url || 'http://localhost:4321').replace(/\/$/, '');
    const watchUrl = `${siteUrl}/xem/${movieSlug}`;

    const content = `🍿 <@${discordId}> đang xem tập **${episodeName}** phim **[${movieTitle}](${watchUrl})**`;

    const res = await fetch(`https://discord.com/api/v10/channels/${channelDangXem}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${discord.bot_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      console.warn(`Lỗi khi gửi watch-status lên Discord: ${res.status} - ${errTxt}`);
      return apiResponse({ sent: false, error: errTxt }, 'success', '', 200, request);
    }

    return apiResponse({ sent: true }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
