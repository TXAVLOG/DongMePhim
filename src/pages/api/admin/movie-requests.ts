import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifySession } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { getEmailTemplate } from '@templates/emails/emailReader';
import { SmtpClient } from '@lib/api/smtpClient';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await verifySession(request, cookies) as any;
    const isAdmin = user && (user.role === 'admin' || user.roles === 'admin');
    if (!isAdmin) {
      return apiResponse(null, 'error', 'Không có quyền truy cập!', 403, request);
    }

    const { data: list, error } = await supabase
      .from('movie_requests')
      .select('*, users:user_id(username, email, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return apiResponse(list || [], 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const adminUser = await verifySession(request, cookies) as any;
    const isAdmin = adminUser && (adminUser.role === 'admin' || adminUser.roles === 'admin');
    if (!isAdmin) {
      return apiResponse(null, 'error', 'Không có quyền truy cập!', 403, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { id, action, reject_reason } = body;
    if (!id || !action) {
      return apiResponse(null, 'error', 'Thiếu thông số id hoặc hành động (action)!', 400, request);
    }

    // Get the request details first
    const { data: movieReq, error: fetchErr } = await supabase
      .from('movie_requests')
      .select('*, users:user_id(username, email, name)')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !movieReq) {
      return apiResponse(null, 'error', 'Không tìm thấy yêu cầu phim!', 404, request);
    }

    const movieName = movieReq.name;
    const targetUserId = movieReq.user_id;
    const targetUserEmail = movieReq.users?.email;
    const targetUserName = movieReq.users?.name || movieReq.users?.username || 'Thành viên';

    if (action === 'approve') {
      const { error: updateErr } = await supabase
        .from('movie_requests')
        .update({ status: 'approved' })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Add Notification
      if (targetUserId) {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          title: 'Yêu cầu phim được duyệt',
          body: `Yêu cầu phim "${movieName}" của bạn đã được duyệt và cập nhật lên hệ thống.`,
        });
      }

      // Send Email if configured and user has email
      if (targetUserEmail) {
        try {
          const settings = await SettingService.getSettings();
          const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);
          if (isSmtpConfigured) {
            const siteName = settings.general?.site_name || 'DongMePhim';
            const siteUrl = settings.general?.site_url || 'https://dongmephim.online';
            const year = new Date().getFullYear().toString();

            const rawTemplate = getEmailTemplate('movie-request-approved.html');
            const compiledHtml = rawTemplate
              .replace(/{name}/g, targetUserName)
              .replace(/{movie_name}/g, movieName)
              .replace(/{site_name}/g, siteName)
              .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
              .replace(/{year}/g, year);

            const emailLogHtml = getEmailTemplate('verify-email.html')
              .replace(/{name}/g, targetUserName)
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
              to: targetUserEmail,
              subject: `[${siteName}] Yêu cầu phim "${movieName}" đã được duyệt`,
              html: emailLogHtml
            });

            // Log email
            try {
              await supabase.from('txa_email_logs').insert({
                recipient: targetUserEmail,
                sender: settings.smtp.smtp_user,
                subject: `[${siteName}] Yêu cầu phim "${movieName}" đã được duyệt`,
                category: 'movie-request-approved',
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
          console.error('Error sending movie approval email:', emailErr);
        }
      }

      return apiResponse({ success: true }, 'success', 'Đã duyệt yêu cầu phim thành công!', 200, request);
    }

    if (action === 'reject') {
      if (!reject_reason) {
        return apiResponse(null, 'error', 'Vui lòng cung cấp lý do từ chối!', 400, request);
      }

      const { error: updateErr } = await supabase
        .from('movie_requests')
        .update({ status: 'rejected', reject_reason })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Add Notification
      if (targetUserId) {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          title: 'Yêu cầu phim bị từ chối',
          body: `Yêu cầu phim "${movieName}" của bạn đã bị từ chối. Lý do: ${reject_reason}`,
        });
      }

      // Send Email if configured and user has email
      if (targetUserEmail) {
        try {
          const settings = await SettingService.getSettings();
          const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);
          if (isSmtpConfigured) {
            const siteName = settings.general?.site_name || 'DongMePhim';
            const siteUrl = settings.general?.site_url || 'https://dongmephim.online';
            const year = new Date().getFullYear().toString();

            const rawTemplate = getEmailTemplate('movie-request-rejected.html');
            const compiledHtml = rawTemplate
              .replace(/{name}/g, targetUserName)
              .replace(/{movie_name}/g, movieName)
              .replace(/{reject_reason}/g, reject_reason)
              .replace(/{site_name}/g, siteName)
              .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
              .replace(/{year}/g, year);

            const emailLogHtml = getEmailTemplate('verify-email.html')
              .replace(/{name}/g, targetUserName)
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
              to: targetUserEmail,
              subject: `[${siteName}] Cập nhật về yêu cầu phim "${movieName}"`,
              html: emailLogHtml
            });

            // Log email
            try {
              await supabase.from('txa_email_logs').insert({
                recipient: targetUserEmail,
                sender: settings.smtp.smtp_user,
                subject: `[${siteName}] Cập nhật về yêu cầu phim "${movieName}"`,
                category: 'movie-request-rejected',
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
          console.error('Error sending movie rejection email:', emailErr);
        }
      }

      return apiResponse({ success: true }, 'success', 'Đã từ chối yêu cầu phim!', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
