import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { TxaJsonDb } from '@services/TxaJsonDb';

// Bảng lưu thông tin xem phim gần nhất của từng user trên Discord
const userWatchMessageMap = new Map<string, { watchKey: string; messageId: string; modLogMessageId?: string }>();

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

    // 2. Lấy cấu hình credentials từ database và kênh hệ thống từ config.json local
    const settings = await SettingService.getSettings();
    const discord = settings.discord;

    if (!discord || !discord.bot_token) {
      return apiResponse({ sent: false, reason: 'Chưa cấu hình Bot Token' }, 'success', '', 200, request);
    }

    const localConfig = await TxaJsonDb.getDiscordConfig();
    let channelDangXem = discord.channels?.dang_xem || discord.channels?.dangxem || localConfig?.channels?.dang_xem;
    let channelModLog = discord.channels?.mod_log || discord.channels?.modlog || localConfig?.channels?.mod_log;

    // Tự động tìm ID kênh nếu chưa cấu hình chính xác
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

    // 3. Chuẩn hóa tên tập để tránh lặp từ "tập Tập"
    const rawEp = String(episodeName || '').trim();
    const epNumOnly = rawEp.replace(/^tập\s*/i, '').trim() || rawEp;
    const fullEpDisplay = /^tập/i.test(rawEp) ? rawEp : `Tập ${rawEp}`;

    // Gửi tin nhắn trạng thái lên Discord với Embed chuẩn hyperlink
    const discordId = connection.discord_id;
    const siteUrl = (settings.general?.site_url || 'https://dongmephim.online').replace(/\/$/, '');
    const watchUrl = `${siteUrl}/xem/${movieSlug}?ep=${encodeURIComponent(episodeSlug || '')}`;

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

    // 4. Gửi hoặc chỉnh sửa tin nhắn trạng thái tại kênh #dang-xem
    if (channelDangXem) {
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
          console.warn('Không thể edit tin nhắn xem phim cũ trên Discord (#dang-xem):', patchErr);
        }
      }

      // Nếu không edit được (hoặc chưa có tin nhắn cũ), gửi tin nhắn mới
      if (!isUpdated) {
        try {
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
            console.warn(`Lỗi khi gửi watch-status tới #dang-xem: ${postRes.status} - ${errTxt}`);
          }
        } catch (postErr) {
          console.warn('Lỗi kết nối khi gửi watch-status tới #dang-xem:', postErr);
        }
      }
    }

    // 5. Gửi hoặc chỉnh sửa nhật ký theo dõi riêng tới kênh #mod-log (tránh spam)
    let finalModLogId: string | undefined = userCache?.modLogMessageId;
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
        }
      } catch (logErr) {
        console.warn('Lỗi khi gửi nhật ký xem phim tới kênh #mod-log:', logErr);
      }
    }

    if (finalMessageId) {
      userWatchMessageMap.set(user.id, {
        watchKey: currentWatchKey,
        messageId: finalMessageId,
        modLogMessageId: finalModLogId
      });
    }

    return apiResponse({ sent: true, updated: isUpdated, messageId: finalMessageId }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

