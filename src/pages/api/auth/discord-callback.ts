import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { TxaJsonDb } from '@services/TxaJsonDb';
import { TxaActivityCalculator } from '@services/TxaActivityCalculator';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    return Response.redirect(`${url.origin}/thong-tin?discord_error=${encodeURIComponent(errorParam)}`);
  }

  if (!code) {
    return Response.redirect(`${url.origin}/thong-tin?discord_error=missing_code`);
  }

  try {
    // 1. Kiểm tra xác thực người dùng trên website
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return Response.redirect(`${url.origin}/?login=true&redirect=/connect-discord`);
    }

    // 2. Lấy cấu hình Discord từ Site Settings
    const settings = await SettingService.getSettings();
    const discord = settings.discord;

    if (!discord || !discord.client_id || !discord.client_secret) {
      return Response.redirect(`${url.origin}/thong-tin?discord_error=not_configured`);
    }

    const siteUrl = (settings.general?.site_url || url.origin).replace(/\/$/, '');
    const redirectUri = `${siteUrl}/api/auth/discord-callback`;

    // 3. Trao đổi Authorization Code lấy Access Token từ Discord
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: discord.client_id,
        client_secret: discord.client_secret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenRes.ok) {
      const errTxt = await tokenRes.text();
      console.error('Lỗi đổi code lấy token Discord:', errTxt);
      return Response.redirect(`${url.origin}/thong-tin?discord_error=token_exchange_failed`);
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
      const errTxt = await userRes.text();
      console.error('Lỗi lấy thông tin user từ Discord:', errTxt);
      return Response.redirect(`${url.origin}/thong-tin?discord_error=user_fetch_failed`);
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

    if (existingDisc && existingDisc.user_id !== user.id) {
      return Response.redirect(`${url.origin}/thong-tin?discord_error=discord_already_linked`);
    }

    const { data: existingUser } = await supabase
      .from('txa_discord_connections')
      .select('discord_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingUser && existingUser.discord_id !== discordId) {
      return Response.redirect(`${url.origin}/thong-tin?discord_error=user_already_linked`);
    }

    // 6. Ghi nhận liên kết vào DB Supabase
    const { error: upsertError } = await supabase
      .from('txa_discord_connections')
      .upsert({
        user_id: user.id,
        discord_id: discordId,
        username: discordUsername,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Lỗi khi lưu liên kết vào DB:', upsertError);
      return Response.redirect(`${url.origin}/thong-tin?discord_error=db_save_failed`);
    }

    // 7. Đồng bộ vai trò trên Discord Server sử dụng Bot Token
    if (discord.bot_token && discord.guild_id) {
      const headers = {
        'Authorization': `Bot ${discord.bot_token}`,
        'Content-Type': 'application/json'
      };

      // Đọc vai trò từ cấu hình local JSON
      const localConfig = TxaJsonDb.getDiscordConfig();
      const roles = localConfig.roles;

      // Gỡ bỏ role Unverified (nếu có)
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
      await TxaActivityCalculator.recalculateLevel(user.id);

      // Đồng bộ vai trò Gói dịch vụ
      await TxaActivityCalculator.syncMemberPackageRoles(user.id, user.package || 'free');
    }

    return Response.redirect(`${url.origin}/thong-tin?discord_success=true`);
  } catch (err: any) {
    console.error('Lỗi nghiêm trọng trong Discord callback:', err);
    return Response.redirect(`${url.origin}/thong-tin?discord_error=system_error`);
  }
};
