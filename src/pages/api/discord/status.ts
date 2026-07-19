import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
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

export const GET: APIRoute = async ({ request, url }) => {
  try {
    if (!(await verifyBotRequest(request))) {
      return apiResponse(null, 'error', 'Unauthorized', 401, request);
    }

    const discordId = url.searchParams.get('discordId');
    if (!discordId) {
      return apiResponse(null, 'error', 'Thiếu tham số discordId', 400, request);
    }

    // 1. Tìm thông tin liên kết từ database Supabase
    const { data: connection, error: connError } = await supabase
      .from('txa_discord_connections')
      .select('user_id')
      .eq('discord_id', discordId)
      .maybeSingle();

    if (connError || !connection) {
      return apiResponse({ connected: false }, 'success', 'Tài khoản Discord chưa liên kết website', 200, request);
    }

    const userId = connection.user_id;

    // 2. Lấy thông tin user từ Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username, email, name, package, expiry_date')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return apiResponse({ connected: false }, 'success', 'Không tìm thấy thông tin tài khoản website', 200, request);
    }

    // 3. Lấy thông tin chỉ số hoạt động (activity stats) từ Supabase
    const stats = await TxaActivityCalculator.getOrCreateStats(userId);
    const points = TxaActivityCalculator.calculatePoints(stats);

    const { count: favoritesCount } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Tính toán hạn gói cước
    let expiryText = 'Vô hạn';
    let remainingDays = -1;
    if (user.expiry_date) {
      const expiry = new Date(user.expiry_date).getTime();
      const diff = expiry - Date.now();
      if (diff <= 0) {
        expiryText = 'Đã hết hạn';
        remainingDays = 0;
      } else {
        remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const formattedDate = new Date(user.expiry_date).toLocaleDateString('vi-VN');
        expiryText = `Còn ${remainingDays} ngày (Hết hạn: ${formattedDate})`;
      }
    }

    // Lấy tên gói cước đẹp mắt
    const settings = await SettingService.getSettings();
    const packages = settings.packages || [];
    const userPkg = packages.find((p: any) => p.id.toLowerCase() === (user.package || 'free').toLowerCase());
    const packageTitle = userPkg?.title || 'Gói Free';

    // 4. Lấy số cảnh cáo vi phạm từ local JSON
    const violationsData = loadViolationsData();
    const violationCount = violationsData[discordId] || 0;

    return apiResponse({
      connected: true,
      user: {
        username: user.username,
        email: user.email,
        name: user.name,
        package: user.package || 'free',
        packageTitle: packageTitle,
        expiryText: expiryText,
        remainingDays: remainingDays
      },
      stats: {
        totalWatchSeconds: stats.total_watch_seconds,
        totalRatings: stats.total_ratings,
        totalComments: stats.total_comments,
        discordMessageCount: stats.discord_message_count,
        totalFavorites: favoritesCount || 0,
        level: stats.level,
        points: points,
        violationCount: violationCount
      }
    }, 'success', 'Lấy thông tin tài khoản thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// Helper đọc nhanh violations.json cục bộ
import fs from 'fs';
import path from 'path';
function loadViolationsData(): Record<string, number> {
  const filePath = path.resolve(process.cwd(), '../anh4-bot/data/violations.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return {};
  }
}
