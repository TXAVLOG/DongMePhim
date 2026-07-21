import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
import { TxaJsonDb } from '@services/TxaJsonDb';
import { TxaActivityCalculator } from '@services/TxaActivityCalculator';

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

export const GET: APIRoute = async ({ request }) => {
  try {
    if (!(await verifyBotRequest(request))) {
      return apiResponse(null, 'error', 'Unauthorized', 401, request);
    }

    // 1. Lấy tất cả danh sách liên kết Discord từ database Supabase
    const { data: connList, error: connError } = await supabase
      .from('txa_discord_connections')
      .select('user_id, discord_id, discord_username');

    if (connError) throw connError;

    // 2. Lấy tất cả dữ liệu stats từ server Supabase
    const { data: statsList } = await supabase
      .from('txa_user_activity_stats')
      .select('*');

    const statsMap = new Map<string, any>();
    (statsList || []).forEach(s => {
      statsMap.set(s.user_id, s);
    });

    // 3. Với mỗi user đã kết nối Discord, đảm bảo stats tồn tại và tính điểm
    const leaderboardPromises = (connList || []).map(async (conn) => {
      let stats = statsMap.get(conn.user_id);
      if (!stats) {
        stats = await TxaActivityCalculator.getOrCreateStats(conn.user_id);
      }
      const points = TxaActivityCalculator.calculatePoints(stats);
      return {
        userId: conn.user_id,
        discordId: conn.discord_id,
        discordUsername: conn.discord_username,
        watchSeconds: stats.total_watch_seconds || 0,
        ratings: stats.total_ratings || 0,
        comments: stats.total_comments || 0,
        chatCount: stats.discord_message_count || 0,
        level: stats.level || 'Mầm Non',
        points
      };
    });

    const results = await Promise.all(leaderboardPromises);
    const leaderboard = results
      .filter(x => x.discordId !== null)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    return apiResponse(leaderboard, 'success', 'Lấy bảng xếp hạng thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!(await verifyBotRequest(request))) {
      return apiResponse(null, 'error', 'Unauthorized', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { month, discordId, score } = body;
    if (!month || !discordId) {
      return apiResponse(null, 'error', 'Thiếu tham số month hoặc discordId', 400, request);
    }

    // 1. Tìm user_id liên kết từ database Supabase
    const { data: connection, error: connError } = await supabase
      .from('txa_discord_connections')
      .select('user_id')
      .eq('discord_id', discordId)
      .maybeSingle();

    if (connError || !connection) {
      return apiResponse(null, 'error', 'Tài khoản chưa liên kết website', 404, request);
    }

    const userId = connection.user_id;

    // 2. Ghi nhận nhà vô địch tháng vào tệp JSON cục bộ
    TxaJsonDb.awardWinner(month, userId, parseFloat(score) || 0);

    // 3. Kiểm tra xem người này có vô địch 3 tháng liên tiếp gần nhất không từ tệp JSON
    const settings = await SettingService.getSettings();
    const discord = settings.discord;

    if (!discord || !discord.bot_token || !discord.guild_id) {
      return apiResponse({ awarded: true, consecutive: false }, 'success', 'Đã ghi nhận chiến thắng (Chưa cấu hình Discord)', 200, request);
    }

    const currentMonthDate = new Date(`${month}-01T00:00:00`);
    const monthsToCheck: string[] = [month];
    for (let i = 1; i <= 2; i++) {
      const d = new Date(currentMonthDate);
      d.setMonth(d.getMonth() - i);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsToCheck.push(mStr);
    }

    // Đọc lịch sử winners từ JSON
    const pastWinners = TxaJsonDb.getLeaderboardWinners();
    const userWins = pastWinners.filter(w => w.user_id === userId && monthsToCheck.includes(w.month));
    const isConsecutive = userWins.length >= 3;

    // 4. Gán vai trò vinh danh trên Discord
    const headers = {
      'Authorization': `Bot ${discord.bot_token}`,
      'Content-Type': 'application/json'
    };

    // Đọc vai trò vinh danh từ cấu hình local JSON
    const localConfig = await TxaJsonDb.getDiscordConfig();
    const roles = localConfig.roles;

    if (isConsecutive && roles.top_1_consecutive) {
      try {
        await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roles.top_1_consecutive}`, {
          method: 'PUT',
          headers
        });
      } catch (e) {}

      if (roles.top_1_month) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roles.top_1_month}`, {
            method: 'DELETE',
            headers
          });
        } catch (e) {}
      }
    } else if (roles.top_1_month) {
      try {
        await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roles.top_1_month}`, {
          method: 'PUT',
          headers
        });
      } catch (e) {}
    }

    return apiResponse({ awarded: true, consecutive: isConsecutive }, 'success', 'Ghi nhận trao thưởng bảng xếp hạng thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
