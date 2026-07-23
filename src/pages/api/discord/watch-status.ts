import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { SettingService } from '@services/SettingService';

// Bảng lưu messageId tin nhắn xem phim gần nhất của từng user trên Discord
const userWatchMessageMap = new Map<string, { messageId: string; channelId: string }>();

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

    const { movieTitle, movieSlug, episodeName, lastMessageId } = body;
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

    const channelDangXem = discord.channels?.dang_xem;

    if (!channelDangXem) {
      return apiResponse({ sent: false, reason: 'Chưa cấu hình kênh đang xem (#dang-xem)' }, 'success', '', 200, request);
    }

    // 3. Chuẩn hóa tên tập để tránh lặp từ "tập Tập"
    const rawEp = String(episodeName || '').trim();
    const epNumOnly = rawEp.replace(/^tập\s*/i, '').trim() || rawEp;
    const fullEpDisplay = /^tập/i.test(rawEp) ? rawEp : `Tập ${rawEp}`;

    // Gửi tin nhắn trạng thái lên Discord với Embed chuẩn hyperlink
    const discordId = connection.discord_id;
    const siteUrl = (settings.general?.site_url || 'https://dongmephim.online').replace(/\/$/, '');
    const watchUrl = `${siteUrl}/xem/${movieSlug}?ep=${encodeURIComponent(body.episodeSlug || '')}`;

    const content = `🍿 <@${discordId}> đang xem tập **${epNumOnly}** phim **${movieTitle}**`;
    const embed = {
      title: `🎬 ${movieTitle} - ${fullEpDisplay}`,
      url: watchUrl,
      description: `▶️ **Người xem:** <@${discordId}>\n👉 [**Bấm vào đây để mở phim xem cùng**](${watchUrl})`,
      color: 16744192,
      footer: {
        text: "Hệ Thống Động Mê Phim"
      }
    };

    // 4. Kiểm tra xem có thể edit tin nhắn cũ không
    const existingMessageId = lastMessageId || userWatchMessageMap.get(user.id)?.messageId;
    let finalMessageId: string | null = null;
    let isUpdated = false;

    if (existingMessageId) {
      try {
        const patchRes = await fetch(`https://discord.com/api/v10/channels/${channelDangXem}/messages/${existingMessageId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bot ${discord.bot_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content, embeds: [embed] })
        });

        if (patchRes.ok) {
          const patchData: any = await patchRes.json();
          finalMessageId = patchData.id || existingMessageId;
          isUpdated = true;
        }
      } catch (patchErr) {
        console.warn('Không thể edit tin nhắn xem phim cũ trên Discord:', patchErr);
      }
    }

    // Nếu không edit được (hoặc chưa có tin nhắn cũ), gửi tin nhắn mới
    if (!isUpdated) {
      const postRes = await fetch(`https://discord.com/api/v10/channels/${channelDangXem}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${discord.bot_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, embeds: [embed] })
      });

      if (postRes.ok) {
        const postData: any = await postRes.json();
        finalMessageId = postData.id;
      } else {
        const errTxt = await postRes.text();
        console.warn(`Lỗi khi gửi watch-status lên Discord: ${postRes.status} - ${errTxt}`);
        return apiResponse({ sent: false, error: errTxt }, 'success', '', 200, request);
      }
    }

    if (finalMessageId) {
      userWatchMessageMap.set(user.id, { messageId: finalMessageId, channelId: channelDangXem });
    }

    // 5. Gửi nhật ký theo dõi riêng tới kênh #mod-log
    let channelModLog = discord.channels?.mod_log || discord.channels?.modlog;
    if (!channelModLog && discord.guild_id) {
      try {
        const chRes = await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/channels`, {
          headers: { 'Authorization': `Bot ${discord.bot_token}` }
        });
        if (chRes.ok) {
          const list: any[] = await chRes.json();
          const found = list.find((c: any) => c.type === 0 && (c.name === 'mod-log' || c.name === 'mod_log'));
          if (found) channelModLog = found.id;
        }
      } catch (e) {}
    }

    if (channelModLog) {
      try {
        const modLogEmbed = {
          title: '📺 NHẬT KÝ XEM PHIM (WATCH LOG)',
          description: `Thành viên <@${discordId}> (\`${user.username || user.name}\`) đang xem phim.`,
          fields: [
            { name: 'Tên phim', value: movieTitle, inline: true },
            { name: 'Tập phim', value: fullEpDisplay, inline: true },
            { name: 'Đường dẫn', value: `[Xem Phim](${watchUrl})`, inline: true }
          ],
          color: 3447003,
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Hệ Thống Kiểm Duyệt Anh 4'
          }
        };

        await fetch(`https://discord.com/api/v10/channels/${channelModLog}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${discord.bot_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ embeds: [modLogEmbed] })
        });
      } catch (logErr) {
        console.warn('Lỗi khi gửi nhật ký xem phim tới kênh #mod-log:', logErr);
      }
    }

    return apiResponse({ sent: true, updated: isUpdated, messageId: finalMessageId }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

