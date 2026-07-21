import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { TxaActivityCalculator } from '@services/TxaActivityCalculator';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');

  let siteUrl = url.origin;

  try {
    // 1. Kiểm tra xác thực người dùng trên website
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return Response.redirect(`${url.origin}/thong-tin?discord_error=failed`);
    }

    // 2. Lấy cấu hình Discord từ Site Settings
    const settings = await SettingService.getSettings();
    const discord = settings.discord;
    siteUrl = (settings.general?.site_url || url.origin).replace(/\/$/, '');

    if (!discord || !discord.client_id || !discord.client_secret) {
      return Response.redirect(`${siteUrl}/thong-tin?discord_error=not_configured`);
    }

    const redirectUri = `${siteUrl}/api/auth/discord-callback`;

    if (!code) {
      return Response.redirect(`${siteUrl}/thong-tin?discord_error=failed`);
    }

    // 3. Trao đổi Authorization Code lấy Access Token từ Discord
    const tokenParams = new URLSearchParams({
      client_id: discord.client_id,
      client_secret: discord.client_secret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    });
    
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    });

    if (!tokenRes.ok) {
      return Response.redirect(`${siteUrl}/thong-tin?discord_error=failed`);
    }

    const tokenData = await tokenRes.json() as any;
    const accessToken = tokenData.access_token;

    // 4. Lấy thông tin tài khoản Discord của User
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userRes.ok) {
      return Response.redirect(`${siteUrl}/thong-tin?discord_error=failed`);
    }

    const discordUser = await userRes.json() as any;
    const discordId = discordUser.id;
    const discordUsername = discordUser.username;

    // 5. Kiểm tra trùng lặp liên kết trên server Supabase
    const { data: existingDisc } = await supabase
      .from('txa_discord_connections')
      .select('user_id')
      .eq('discord_id', discordId)
      .maybeSingle();

    const { data: existingUser } = await supabase
      .from('txa_discord_connections')
      .select('discord_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingDisc && existingDisc.user_id !== user.id) {
      return Response.redirect(`${siteUrl}/thong-tin?discord_error=discord_already_linked`);
    }

    if (existingUser && existingUser.discord_id !== discordId) {
      return Response.redirect(`${siteUrl}/thong-tin?discord_error=user_already_linked`);
    }

    // 6. Ghi nhận liên kết vào DB Supabase
    const { error: upsertError } = await supabase
      .from('txa_discord_connections')
      .upsert({
        user_id: user.id,
        discord_id: discordId,
        discord_username: discordUsername,
        discord_avatar: discordUser.avatar || null,
        access_token: accessToken || null,
        refresh_token: tokenData.refresh_token || null,
        expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (upsertError) {
      return Response.redirect(`${siteUrl}/thong-tin?discord_error=failed`);
    }

    // 7. Đồng bộ vai trò trên Discord Server sử dụng Bot Token
    if (discord.bot_token && discord.guild_id) {
      const headers = {
        'Authorization': `Bot ${discord.bot_token}`,
        'Content-Type': 'application/json'
      };
      const roles = discord.roles || {};
      
      // Gỡ bỏ role Unverified
      if (roles.unverified) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roles.unverified}`, {
            method: 'DELETE',
            headers
          });
        } catch (e) {}
      }

      // Gán role Member
      if (roles.member) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roles.member}`, {
            method: 'PUT',
            headers
          });
        } catch (e) {}
      }

      // Đồng bộ vai trò Cấp độ hoạt động
      try {
        await TxaActivityCalculator.recalculateLevel(user.id);
      } catch (e) {}

      // Đồng bộ vai trò Gói dịch vụ
      try {
        await TxaActivityCalculator.syncMemberPackageRoles(user.id, user.package || 'free');
      } catch (e) {}

      // Gửi tin nhắn DM ngay lập tức cho người dùng thông báo liên kết thành công & bảng quản lý
      try {
        const stats = await TxaActivityCalculator.getOrCreateStats(user.id);
        const watchHours = (Math.round(((stats?.total_watch_seconds || 0) / 3600) * 10) / 10).toFixed(1);
        const packagesList = settings.packages || [];

        let packageTitle = 'Gói Free';
        const rawPkg = (user.package || 'free').trim().toLowerCase();
        const foundPkg = packagesList.find((p: any) => (p.id || '').trim().toLowerCase() === rawPkg || (p.title || '').trim().toLowerCase() === rawPkg);
        if (foundPkg?.title) {
          packageTitle = foundPkg.title;
        } else if (user.package) {
          packageTitle = user.package;
        }

        const expiryText = user.expiry_date ? new Date(user.expiry_date).toLocaleDateString('vi-VN') : 'Vô hạn';
        const usernameDisplay = user.username || user.name || discordUsername;

        const dmRes = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ recipient_id: discordId })
        });

        if (dmRes.ok) {
          const dmChannel = await dmRes.json() as any;
          const embed: any = {
            title: '🔐 QUẢN LÝ TÀI KHOẢN ĐỘNG MÊ PHIM',
            description: `🎉 **Chúc mừng!** Bạn đã **liên kết tài khoản thành công** với Website Động Mê Phim.\n\n` +
                         `• **Tên tài khoản:** \`${usernameDisplay}\`\n` +
                         `• **Email:** \`${user.email}\`\n` +
                         `• **Gói dịch vụ:** \`${packageTitle}\` (Hạn dùng: \`${expiryText}\`)\n` +
                         `• **Cấp độ / Danh hiệu:** \`${stats?.level || 'Mầm Non'}\`\n` +
                         `• **Thống kê:** \`${watchHours}\`h xem phim | \`${stats?.total_ratings || 0}\` lượt đánh giá | \`${stats?.total_comments || 0}\` bình luận\n\n` +
                         `💡 *Kênh **#xac-minh** đã được tự động ẩn trên Server. Bạn có thể nhấn nút **Đăng Xuất / Hủy Liên Kết** dưới đây bất kỳ lúc nào.*`,
            color: 0x3498DB
          };

          if (user.avatar_url) {
            embed.thumbnail = { url: user.avatar_url };
          }

          const components = [
            {
              type: 1, // ACTION_ROW
              components: [
                {
                  type: 2, // BUTTON
                  style: 4, // DANGER
                  label: '🚪 Hủy Liên Kết / Đăng Xuất',
                  custom_id: 'btn_dm_unlink_action'
                },
                {
                  type: 2, // BUTTON
                  style: 1, // PRIMARY
                  label: '🔄 Cập Nhật Thông Tin',
                  custom_id: 'btn_dm_refresh_action'
                }
              ]
            }
          ];

          // Quét 10 tin nhắn gần đây nhất trong DM channel để tìm tin nhắn cũ của Bot
          let existingBotMsgId: string | null = null;
          try {
            const historyRes = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages?limit=10`, { headers });
            if (historyRes.ok) {
              const messages = await historyRes.json() as any[];
              const botMsg = messages.find((m: any) => m.author?.bot || (m.embeds && m.embeds[0]?.title?.includes('QUẢN LÝ TÀI KHOẢN')));
              if (botMsg) {
                existingBotMsgId = botMsg.id;
              }
            }
          } catch (hErr) {}

          if (existingBotMsgId) {
            await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages/${existingBotMsgId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                embeds: [embed],
                components: components
              })
            });
          } else {
            await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                embeds: [embed],
                components: components
              })
            });
          }
        }
      } catch (dmErr) {
        console.warn('Lỗi khi gửi DM thông báo liên kết tài khoản:', dmErr);
      }
    }

    return Response.redirect(`${siteUrl}/thong-tin?discord_success=true`);

  } catch (err: any) {
    console.error('Lỗi nghiêm trọng trong Discord callback:', err);
    return Response.redirect(`${siteUrl || url.origin}/thong-tin?discord_error=failed`);
  }
};
