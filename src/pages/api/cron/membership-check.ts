import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
import { getEmailTemplate } from '@templates/emails/emailReader';
import { SmtpClient } from '@lib/api/smtpClient';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret') || request.headers.get('x-cron-secret');
    const expectedSecret = import.meta.env.CRON_SECRET || 'txa-cron-kkphim-2026-secure';

    if (secret !== expectedSecret && import.meta.env.PROD) {
      return apiResponse(null, 'error', 'Unauthorized cron trigger', 401, request);
    }

    const settings = await SettingService.getSettings();
    const siteUrl = settings.general?.site_url || 'https://dongmephim.online';
    const siteName = settings.general?.site_name || 'DongMePhim';
    const now = new Date();
    const year = now.getFullYear().toString();

    // 1. Quét tất cả users có expiry_date không null
    const { data: users, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .not('expiry_date', 'is', null);

    if (fetchErr) throw fetchErr;

    let warningSent = 0;
    let expiredProcessed = 0;

    for (const user of users) {
      const userPackageName = (user.package || 'free').toLowerCase();
      if (userPackageName === 'free') continue;

      const expiryDate = new Date(user.expiry_date);
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);

      // A. Nếu hết hạn (diffDays <= 0)
      if (diffDays <= 0) {
        // Cập nhật database: chuyển về free, expiry_date = null
        const { error: updateErr } = await supabase
          .from('users')
          .update({
            package: 'free',
            expiry_date: null,
            updated_at: now.toISOString()
          })
          .eq('id', user.id);

        if (updateErr) {
          console.error(`Error downgrading user ${user.username}:`, updateErr);
          continue;
        }

        expiredProcessed++;

        // Gửi email thông báo hết hạn
        try {
          const contentTemplate = getEmailTemplate('content-expiry-expired.html');
          const formattedExpiry = expiryDate.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          const emailContent = contentTemplate
            .replace(/{name}/g, user.username)
            .replace(/{package_title}/g, user.package)
            .replace(/{expiry_date}/g, formattedExpiry)
            .replace(/{site_name}/g, siteName)
            .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''));
            
          const htmlTemplate = getEmailTemplate('verify-email.html');
          const compiledHtml = htmlTemplate
            .replace(/{name}/g, user.username)
            .replace(/{verification_content}/g, emailContent)
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
            to: user.email,
            subject: `[${siteName}] Gói dịch vụ của bạn đã hết hạn`,
            html: compiledHtml
          });

          await supabase.from('txa_email_logs').insert({
            recipient: user.email,
            sender: settings.smtp.smtp_user,
            subject: `[${siteName}] Gói dịch vụ của bạn đã hết hạn`,
            category: 'expiry-expired',
            status: 'success'
          });
        } catch (emailErr) {
          console.error(`Error sending expiry email to ${user.email}:`, emailErr);
        }
      } 
      // B. Nếu còn hạn và sắp hết hạn sau 3 ngày (diffDays <= 3.0 && diffDays >= 2.0)
      else if (diffDays <= 3.0 && diffDays >= 2.0) {
        // Kiểm tra xem gói cước có chu kỳ hàng tháng hoặc hàng năm
        const packagesList = settings.packages || [];
        const userPkg = packagesList.find((p: any) => p.id === user.package || p.title === user.package);
        const cycle = (userPkg?.cycle || '').toLowerCase();
        
        if (cycle === 'monthly' || cycle === 'annual') {
          // Kiểm tra xem đã gửi cảnh báo trong 24 giờ qua chưa để tránh gửi lặp
          const { data: existingWarning } = await supabase
            .from('txa_email_logs')
            .select('id')
            .eq('recipient', user.email)
            .eq('category', 'expiry-warning')
            .gte('created_at', new Date(now.getTime() - 24 * 3600 * 1000).toISOString())
            .maybeSingle();

          if (!existingWarning) {
            warningSent++;
            try {
              const contentTemplate = getEmailTemplate('content-expiry-warning.html');
              const formattedExpiry = expiryDate.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
              const emailContent = contentTemplate
                .replace(/{name}/g, user.username)
                .replace(/{package_title}/g, user.package)
                .replace(/{expiry_date}/g, formattedExpiry)
                .replace(/{site_name}/g, siteName)
                .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''));
                
              const htmlTemplate = getEmailTemplate('verify-email.html');
              const compiledHtml = htmlTemplate
                .replace(/{name}/g, user.username)
                .replace(/{verification_content}/g, emailContent)
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
                to: user.email,
                subject: `[${siteName}] Sắp hết hạn gói dịch vụ - Gia hạn tự động`,
                html: compiledHtml
              });

              await supabase.from('txa_email_logs').insert({
                recipient: user.email,
                sender: settings.smtp.smtp_user,
                subject: `[${siteName}] Sắp hết hạn gói dịch vụ - Gia hạn tự động`,
                category: 'expiry-warning',
                status: 'success'
              });
            } catch (emailErr) {
              console.error(`Error sending expiry warning to ${user.email}:`, emailErr);
            }
          }
        }
      }
    }

    return apiResponse({
      warnings_sent: warningSent,
      expired_processed: expiredProcessed,
      message: `Quét hạn dùng thành công. Gửi ${warningSent} cảnh báo và hạ cấp ${expiredProcessed} tài khoản.`
    }, 'success', '', 200, request);

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
