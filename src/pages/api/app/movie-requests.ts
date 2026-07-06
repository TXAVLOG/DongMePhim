import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { getEmailTemplate } from '@templates/emails/emailReader';
import { SmtpClient } from '@lib/api/smtpClient';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Vui lòng đăng nhập để thực hiện chức năng này!', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { name, origin_name, publish_year, link, author } = body;
    if (!name) {
      return apiResponse(null, 'error', 'Tên phim không được để trống!', 400, request);
    }

    // Insert request into database
    const { data: insertedData, error } = await supabase
      .from('movie_requests')
      .insert({
        user_id: user.id,
        name,
        origin_name: origin_name || null,
        publish_year: parseInt(publish_year) || null,
        link: link || null,
        author: author || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Try sending email to admin
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
          .replace(/{username}/g, user.username || user.name || 'Thành viên')
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

        const sendResult = await SmtpClient.sendMail({
          host: settings.smtp.smtp_host,
          port: settings.smtp.smtp_port,
          secure: settings.smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
          user: settings.smtp.smtp_user,
          pass: settings.smtp.smtp_pass,
          fromEmail: settings.smtp.smtp_user,
          fromName: siteName
        }, {
          to: adminEmail,
          subject: `[${siteName}] Yêu cầu phim mới: ${name}`,
          html: emailLogHtml
        });

        // Log the email in db
        try {
          await supabase.from('txa_email_logs').insert({
            recipient: adminEmail,
            sender: settings.smtp.smtp_user,
            subject: `[${siteName}] Yêu cầu phim mới: ${name}`,
            category: 'movie-request-admin',
            status: 'success',
            response_code: sendResult.responseCode || '250 OK',
            smtp_config: {
              host: settings.smtp.smtp_host,
              port: settings.smtp.smtp_port,
              secure: settings.smtp.smtp_secure,
              user: settings.smtp.smtp_user
            },
            html: emailLogHtml
          });
        } catch (dbLogErr) {}
      }
    } catch (emailErr) {
      console.error('Lỗi khi gửi email thông báo yêu cầu phim tới admin:', emailErr);
    }

    return apiResponse(insertedData, 'success', 'Gửi yêu cầu thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
