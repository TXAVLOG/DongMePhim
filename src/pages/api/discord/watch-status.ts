import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { TxaJsonDb } from '@services/TxaJsonDb';

// Bảng lưu thông tin xem phim gần nhất của từng user trên Discord để tránh spam & hỗ trợ edit tin nhắn
const userWatchMessageMap = new Map<string, { watchKey: string; messageId?: string; modLogMessageId?: string }>();

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

    const { movieTitle, movieSlug, episodeName, episodeSlug, lastMessageId } = body;
    if (!movieTitle || !movieSlug || !episodeName) {
      return apiResponse(null, 'error', 'Thiếu tham số', 400, request);
    }

    const currentWatchKey = `${movieSlug}:${episodeSlug || episodeName}`;
    const userCache = userWatchMessageMap.get(user.id);

    // Chặn gửi lặp: nếu user vẫn đang xem cùng phim & cùng tập, không làm gì cả
    if (userCache && userCache.watchKey === currentWatchKey) {
      return apiResponse({ sent: false, reason: 'Đang xem cùng phim và tập, không gửi lại' }, 'success', '', 200, request);
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

    // 2. Lấy cấu hình credentials từ database và kênh hệ thống
    const settings = await SettingService.getSettings();
    const discord = settings.discord;

    if (!discord || !discord.bot_token) {
      return apiResponse({ sent: false, reason: 'Chưa cấu hình Bot Token' }, 'success', '', 200, request);
    }

    const localConfig = await TxaJsonDb.getDiscordConfig();
    let channelDangXem = discord.channels?.dang_xem || discord.channels?.dangxem || localConfig?.channels?.dang_xem;
    let channelModLog = discord.channels?.mod_log || discord.channels?.modlog || localConfig?.channels?.mod_log;

    // Tự động quét tìm ID kênh trên Discord Server nếu chưa cấu hình chính xác
    if ((!channelDangXem || !channelModLog) && discord.guild_id) {
      try {
        const chRes = await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/channels`, {
          headers: { 'Authorization': `Bot ${discord.bot_token}` }
        });
        if (chRes.ok) {
          const list: any[] = await chRes.json();
          if (!channelDangXem) {
            const foundDangXem = list.find((c: any) => c.type === 0 && (c.name === 'dang-xem' || c.name === 'dang_xem' || c.name.includes('dang-xem') || c.name.includes('đang-xem')));
            if (foundDangXem) channelDangXem = foundDangXem.id;
          }
          if (!channelModLog) {
            const foundModLog = list.find((c: any) => c.type === 0 && (c.name === 'mod-log' || c.name === 'mod_log'));
            if (foundModLog) channelModLog = foundModLog.id;
          }
        }
      } catch (e) {
        console.warn('Lỗi khi fetch guild channels từ Discord:', e);
      }
    }

    if (!channelDangXem && !channelModLog) {
      return apiResponse({ sent: false, reason: 'Chưa tìm thấy kênh Discord (#dang-xem hoặc #mod-log)' }, 'success', '', 200, request);
    }

    // 3. Chuẩn hóa tên tập & thông tin phim
    const rawEp = String(episodeName || '').trim();
    const epNumOnly = rawEp.replace(/^tập\s*/i, '').trim() || rawEp;
    const fullEpDisplay = /^tập/i.test(rawEp) ? rawEp : `Tập ${rawEp}`;

    const discordId = connection.discord_id;
    const siteUrl = (settings.general?.site_url || 'https://dongmephim.online').replace(/\/$/, '');
    const watchUrl = `${siteUrl}/xem/${movieSlug}?ep=${encodeURIComponent(episodeSlug || '')}`;

    // Lấy poster phim nếu có
    let posterUrl: string | undefined;
    try {
      const { data: movieData } = await supabase
        .from('movies')
        .select('poster_url, thumb_url')
        .eq('slug', movieSlug)
        .maybeSingle();
      if (movieData) {
        posterUrl = movieData.poster_url || movieData.thumb_url;
      }
    } catch (_) {}

    // --- KÊNH #dang-xem: Embed sinh động, chi tiết, nổi bật ---
    const dangXemContent = `🍿 <@${discordId}> đang thưởng thức **${movieTitle}** - **${fullEpDisplay}**!`;
    const dangXemEmbed: Record<string, any> = {
      title: `🎬 ${movieTitle} • ${fullEpDisplay}`,
      url: watchUrl,
      description: `▶️ **Người xem:** <@${discordId}> (\`${user.username || user.name}\`)\n` +
        `🎞️ **Bộ phim:** [**${movieTitle}**](${watchUrl})\n` +
        `📍 **Tập hiện tại:** **${fullEpDisplay}**\n\n` +
        `👉 [**Bấm vào đây để tham gia xem cùng**](${watchUrl})`,
      color: 16753920, // Orange Gold
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Động Mê Phim • Hệ Thống Đồng Bộ Trực Tuyến',
        icon_url: `${siteUrl}/favicon.ico`
      }
    };
    if (posterUrl) {
      dangXemEmbed.thumbnail = { url: posterUrl };
    }

    // --- KÊNH #mod-log: Embed đơn giản, gọn gàng, trang nhã ---
    const modLogEmbed: Record<string, any> = {
      title: '🛡️ NHẬT KÝ PHÁT PHIM',
      description: `Thành viên <@${discordId}> (\`${user.username || user.name}\`) đã bắt đầu xem **${movieTitle}** (${fullEpDisplay}).\n🔗 [**Xem tại Web**](${watchUrl})`,
      color: 3447003, // Soft Blue
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Hệ Thống Kiểm Duyệt Anh 4'
      }
    };

    const existingMessageId = lastMessageId || userCache?.messageId;
    let finalMessageId: string | null = null;
    let isUpdated = false;

    // 4. Gửi / Cập nhật tin nhắn tại kênh #dang-xem
    if (channelDangXem) {
      if (existingMessageId) {
        try {
          const patchRes = await fetch(`https://discord.com/api/v10/channels/${channelDangXem}/messages/${existingMessageId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bot ${discord.bot_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: dangXemContent, embeds: [dangXemEmbed] })
          });

          if (patchRes.ok) {
            const patchData: any = await patchRes.json();
            finalMessageId = patchData.id || existingMessageId;
            isUpdated = true;
          }
        } catch (patchErr) {
          console.warn('Không thể edit tin nhắn xem phim cũ trên Discord (#dang-xem):', patchErr);
        }
      }

      if (!isUpdated) {
        try {
          const postRes = await fetch(`https://discord.com/api/v10/channels/${channelDangXem}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${discord.bot_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: dangXemContent, embeds: [dangXemEmbed] })
          });

          if (postRes.ok) {
            const postData: any = await postRes.json();
            finalMessageId = postData.id;
          } else {
            const errTxt = await postRes.text();
            console.warn(`Lỗi khi gửi watch-status tới #dang-xem: ${postRes.status} - ${errTxt}`);
          }
        } catch (postErr) {
          console.warn('Lỗi kết nối khi gửi watch-status tới #dang-xem:', postErr);
        }
      }
    }

    // 5. Gửi / Cập nhật nhật ký tại kênh #mod-log
    let finalModLogId: string | undefined = userCache?.modLogMessageId;
    if (channelModLog) {
      let modLogUpdated = false;
      if (finalModLogId) {
        try {
          const patchLogRes = await fetch(`https://discord.com/api/v10/channels/${channelModLog}/messages/${finalModLogId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bot ${discord.bot_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ embeds: [modLogEmbed] })
          });
          if (patchLogRes.ok) {
            modLogUpdated = true;
          }
        } catch (e) {}
      }

      if (!modLogUpdated) {
        try {
          const postLogRes = await fetch(`https://discord.com/api/v10/channels/${channelModLog}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${discord.bot_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ embeds: [modLogEmbed] })
          });
          if (postLogRes.ok) {
            const logData: any = await postLogRes.json();
            finalModLogId = logData.id;
          }
        } catch (logErr) {
          console.warn('Lỗi khi gửi nhật ký xem phim tới kênh #mod-log:', logErr);
        }
      }
    }

    if (finalMessageId || finalModLogId) {
      userWatchMessageMap.set(user.id, {
        watchKey: currentWatchKey,
        messageId: finalMessageId || undefined,
        modLogMessageId: finalModLogId
      });
    }

    return apiResponse({ sent: true, updated: isUpdated, messageId: finalMessageId }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
