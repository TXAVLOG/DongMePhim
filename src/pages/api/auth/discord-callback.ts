import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { TxaJsonDb } from '@services/TxaJsonDb';
import { TxaActivityCalculator } from '@services/TxaActivityCalculator';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');

  // Khai báo đối tượng chứa toàn bộ thông tin debug
  const debugInfo: any = {
    step: 'start',
    code,
    errorParam,
    user: null,
    discordConfig: null,
    redirectUri: null,
    tokenExchange: null,
    discordUser: null,
    databaseChecks: null,
    syncRoles: null,
    error: null
  };

  try {
    // 1. Kiểm tra xác thực người dùng trên website
    debugInfo.step = 'verify_user';
    const user = await verifyUserFromRequest(request, cookies);
    debugInfo.user = user ? { id: user.id, username: user.username, package: user.package } : null;
    if (!user) {
      debugInfo.error = 'Website user not authenticated / session expired';
      return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Lấy cấu hình Discord từ Site Settings
    debugInfo.step = 'get_settings';
    const settings = await SettingService.getSettings();
    const discord = settings.discord;
    debugInfo.discordConfig = discord ? {
      client_id: discord.client_id,
      client_secret: discord.client_secret ? discord.client_secret.substring(0, 5) + '...' : null,
      has_bot_token: !!discord.bot_token,
      guild_id: discord.guild_id
    } : null;

    if (!discord || !discord.client_id || !discord.client_secret) {
      debugInfo.error = 'Discord credentials not configured in Site Settings';
      return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    const siteUrl = (settings.general?.site_url || url.origin).replace(/\/$/, '');
    const redirectUri = `${siteUrl}/api/auth/discord-callback`;
    debugInfo.redirectUri = redirectUri;

    if (!code) {
      debugInfo.error = 'No authorization code returned from Discord';
      return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Trao đổi Authorization Code lấy Access Token từ Discord
    debugInfo.step = 'token_exchange';
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

    debugInfo.tokenExchange = {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
    };

    if (!tokenRes.ok) {
      const errTxt = await tokenRes.text();
      debugInfo.tokenExchange.error = errTxt;
      debugInfo.error = 'Failed to exchange authorization code for access token';
      return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    const tokenData = await tokenRes.json() as any;
    const accessToken = tokenData.access_token;
    debugInfo.tokenExchange.tokenData = {
      access_token: accessToken ? accessToken.substring(0, 10) + '...' : null,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope
    };

    // 4. Lấy thông tin tài khoản Discord của User
    debugInfo.step = 'fetch_discord_user';
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    debugInfo.discordUser = {
      status: userRes.status,
      statusText: userRes.statusText
    };

    if (!userRes.ok) {
      const errTxt = await userRes.text();
      debugInfo.discordUser.error = errTxt;
      debugInfo.error = 'Failed to fetch user profile from Discord';
      return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    const discordUser = await userRes.json() as any;
    const discordId = discordUser.id;
    const discordUsername = discordUser.username;
    debugInfo.discordUser.profile = {
      id: discordId,
      username: discordUsername,
      global_name: discordUser.global_name,
      avatar: discordUser.avatar
    };

    // 5. Kiểm tra trùng lặp liên kết trên server Supabase
    debugInfo.step = 'database_checks';
    const { data: existingDisc, error: checkDiscErr } = await supabase
      .from('txa_discord_connections')
      .select('user_id')
      .eq('discord_id', discordId)
      .maybeSingle();

    const { data: existingUser, error: checkUserErr } = await supabase
      .from('txa_discord_connections')
      .select('discord_id')
      .eq('user_id', user.id)
      .maybeSingle();

    debugInfo.databaseChecks = {
      existingDiscConnection: existingDisc,
      checkDiscError: checkDiscErr,
      existingUserConnection: existingUser,
      checkUserError: checkUserErr
    };

    if (existingDisc && existingDisc.user_id !== user.id) {
      debugInfo.error = `This Discord account (${discordUsername}) is already linked to another website user (${existingDisc.user_id})`;
      return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    if (existingUser && existingUser.discord_id !== discordId) {
      debugInfo.error = `Your website account is already linked to another Discord account (${existingUser.discord_id})`;
      return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    // 6. Ghi nhận liên kết vào DB Supabase
    debugInfo.step = 'database_upsert';
    const { error: upsertError } = await supabase
      .from('txa_discord_connections')
      .upsert({
        user_id: user.id,
        discord_id: discordId,
        username: discordUsername,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    debugInfo.databaseChecks.upsertError = upsertError;

    if (upsertError) {
      debugInfo.error = 'Failed to save discord connection into Supabase database';
      return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    // 7. Đồng bộ vai trò trên Discord Server sử dụng Bot Token
    debugInfo.step = 'sync_roles';
    if (discord.bot_token && discord.guild_id) {
      const headers = {
        'Authorization': `Bot ${discord.bot_token}`,
        'Content-Type': 'application/json'
      };

      const localConfig = TxaJsonDb.getDiscordConfig();
      const roles = localConfig.roles;
      
      debugInfo.syncRoles = {
        rolesConfig: roles,
        unverifiedRoleDeleted: false,
        memberRoleAdded: false,
        syncLevelRes: null,
        syncPackageRes: null
      };

      // Gỡ bỏ role Unverified
      if (roles.unverified) {
        try {
          const delRes = await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roles.unverified}`, {
            method: 'DELETE',
            headers
          });
          debugInfo.syncRoles.unverifiedRoleDeleted = delRes.ok ? 'Success' : `Failed (${delRes.status})`;
        } catch (e: any) {
          debugInfo.syncRoles.unverifiedRoleDeleted = `Error: ${e.message}`;
        }
      }

      // Gán role Member
      if (roles.member) {
        try {
          const putRes = await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roles.member}`, {
            method: 'PUT',
            headers
          });
          debugInfo.syncRoles.memberRoleAdded = putRes.ok ? 'Success' : `Failed (${putRes.status})`;
        } catch (e: any) {
          debugInfo.syncRoles.memberRoleAdded = `Error: ${e.message}`;
        }
      }

      // Đồng bộ vai trò Cấp độ hoạt động
      try {
        await TxaActivityCalculator.recalculateLevel(user.id);
        debugInfo.syncRoles.syncLevelRes = 'Success';
      } catch (e: any) {
        debugInfo.syncRoles.syncLevelRes = `Error: ${e.message}`;
      }

      // Đồng bộ vai trò Gói dịch vụ
      try {
        await TxaActivityCalculator.syncMemberPackageRoles(user.id, user.package || 'free');
        debugInfo.syncRoles.syncPackageRes = 'Success';
      } catch (e: any) {
        debugInfo.syncRoles.syncPackageRes = `Error: ${e.message}`;
      }
    }

    debugInfo.step = 'completed';
    debugInfo.success = true;
    return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    debugInfo.error = err.message || err;
    console.error('Lỗi nghiêm trọng trong Discord callback:', err);
    return new Response(JSON.stringify(debugInfo, null, 2), { headers: { 'Content-Type': 'application/json' } });
  }
};
