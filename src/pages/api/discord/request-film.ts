import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
import { getEmailTemplate } from '@templates/emails/emailReader';
import { SmtpClient } from '@lib/api/smtpClient';

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

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!(await verifyBotRequest(request))) {
      return apiResponse(null, 'error', 'Unauthorized', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { discordId, name, origin_name, publish_year, link, author } = body;
    if (!discordId || !name) {
      return apiResponse(null, 'error', 'Thiếu tham số discordId hoặc name', 400, request);
    }

    // 1. Tìm thông tin liên kết tài khoản từ Supabase DB
    const cleanDiscordId = String(discordId).trim();
    let { data: connection, error: connError } = await supabase
      .from('txa_discord_connections')
      .select('user_id, discord_username')
      .eq('discord_id', cleanDiscordId)
      .maybeSingle();

    if (!connection) {
      // Fallback try numeric or text lookup
      const { data: fallbackConn } = await supabase
        .from('txa_discord_connections')
        .select('user_id, discord_username')
        .or(`discord_id.eq.${cleanDiscordId},user_id.eq.${cleanDiscordId}`)
        .maybeSingle();
      if (fallbackConn) {
        connection = fallbackConn;
      }
    }

    if (!connection) {
      return apiResponse(null, 'error', 'Tài khoản chưa liên kết website', 404, request);
    }

    const userId = connection.user_id;

    // 2. Ghi nhận yêu cầu phim vào database Supabase (movie_requests)
    const { data: insertedData, error: insertError } = await supabase
      .from('movie_requests')
      .insert({
        user_id: userId,
        name,
        origin_name: origin_name || null,
        publish_year: parseInt(publish_year) || null,
        link: link || null,
        author: author || null,
        status: 'pending',
        source: 'discord'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 3. Gửi email thông báo cho Admin (nếu được cấu hình)
    try {
      const settings = await SettingService.getSettings();
      const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);
      const adminEmail = settings.smtp?.smtp_user;

      if (isSmtpConfigured && adminEmail) {
        const siteName = settings.general?.site_name || 'DongMePhim';
        const siteUrl = settings.general?.site_url || 'https://dongmephim.online';
        const year = new Date().getFullYear().toString();
        const sendTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        const rawTemplate = getEmailTemplate('movie-request-admin.html');
        const compiledHtml = rawTemplate
          .replace(/{username}/g, `Discord: ${connection.discord_username || 'Member'}`)
          .replace(/{movie_name}/g, name)
          .replace(/{origin_name}/g, origin_name || 'Chưa cập nhật')
          .replace(/{publish_year}/g, publish_year || 'Chưa cập nhật')
          .replace(/{author}/g, author || 'Chưa cập nhật')
          .replace(/{movie_link}/g, link || 'Không có')
          .replace(/{send_time}/g, sendTime)
          .replace(/{site_name}/g, siteName)
          .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
          .replace(/{year}/g, year);

        const emailLogHtml = getEmailTemplate('verify-email.html')
          .replace(/{name}/g, 'Admin')
          .replace(/{verification_content}/g, compiledHtml)
          .replace(/{site_name}/g, siteName)
          .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
          .replace(/{year}/g, year);

        await SmtpClient.sendMail({
          host: settings.smtp.smtp_host,
          port: settings.smtp.smtp_port,
          secure: settings.smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
          user: settings.smtp.smtp_user,
          pass: settings.smtp.smtp_pass,
          fromEmail: settings.smtp.smtp_user,
          fromName: siteName
        }, {
          to: adminEmail,
          subject: `[${siteName}] Yêu cầu phim mới (từ Discord): ${name}`,
          html: emailLogHtml
        });
      }
    } catch (emailErr) {
      console.error('Lỗi khi gửi email thông báo yêu cầu phim tới admin:', emailErr);
    }

    return apiResponse(insertedData, 'success', 'Gửi yêu cầu phim thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
