import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';
import { SmtpClient } from '@lib/api/smtpClient';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const id = url.searchParams.get('id');
    const settings = await SettingService.getSettings();
    const events = (settings as any).lucky_draw_events || [];

    if (id) {
      const event = events.find((e: any) => e.id === id);
      if (!event) {
        return apiResponse(null, 'error', 'Sự kiện không tồn tại hoặc đã bị xóa!', 404, request);
      }
      return apiResponse(event, 'success', '', 200, request);
    }

    return apiResponse(events, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as any;
    const { action, event, id, phone, winnerName, prizeName } = body;
    const settings = await SettingService.getSettings();
    let events = (settings as any).lucky_draw_events || [];

    if (action === 'save_event') {
      if (!event || !event.id) {
        return apiResponse(null, 'error', 'Thiếu thông tin sự kiện', 400, request);
      }

      const index = events.findIndex((e: any) => e.id === event.id);
      if (index >= 0) {
        events[index] = { ...events[index], ...event, updated_at: new Date().toISOString() };
      } else {
        events.push({ ...event, created_at: new Date().toISOString() });
      }

      await SettingService.updateSettings({ lucky_draw_events: events } as any);
      return apiResponse({ success: true, events }, 'success', 'Lưu cấu hình sự kiện thành công!', 200, request);
    }

    if (action === 'delete_event' && id) {
      events = events.filter((e: any) => e.id !== id);
      await SettingService.updateSettings({ lucky_draw_events: events } as any);
      return apiResponse({ success: true, events }, 'success', 'Xóa sự kiện thành công!', 200, request);
    }

    if (action === 'claim_phone_prize') {
      if (!phone || !winnerName || !prizeName) {
        return apiResponse(null, 'error', 'Thiếu thông tin nhận giải!', 400, request);
      }

      // Gửi Email thông báo cho Admin
      const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);
      if (isSmtpConfigured) {
        try {
          const siteName = settings.general.site_name || 'DongMePhim';
          const adminEmail = settings.smtp.smtp_from_email || settings.smtp.smtp_user;
          const htmlContent = `
            <div style="font-family:sans-serif;padding:20px;background:#121214;color:#fff;border-radius:12px;">
              <h2 style="color:#f59e0b;">🎉 THÔNG BÁO TRÚNG GIẢI ĐIỆN THOẠI / QUÀ TẶNG</h2>
              <p><strong>Người trúng giải:</strong> ${winnerName}</p>
              <p><strong>Tên phần thưởng:</strong> ${prizeName}</p>
              <p><strong>Số điện thoại nhận giải:</strong> <span style="color:#10b981;font-size:18px;font-weight:bold;">${phone}</span></p>
              <p style="color:#a1a1aa;font-size:12px;margin-top:20px;">Hệ thống tự động từ ${siteName}</p>
            </div>
          `;
          await SmtpClient.sendMail({
            host: settings.smtp.smtp_host,
            port: settings.smtp.smtp_port,
            secure: settings.smtp.smtp_secure as any,
            user: settings.smtp.smtp_user,
            pass: settings.smtp.smtp_pass,
            fromEmail: settings.smtp.smtp_from_email,
            fromName: settings.smtp.smtp_from_name,
          }, {
            to: adminEmail,
            subject: `[LUCKY DRAW TRÚNG GIẢI] Người dùng ${winnerName} trúng ${prizeName} - SĐT: ${phone}`,
            html: htmlContent
          });
        } catch (mailErr) {
          console.error('Lỗi gửi mail thông báo trúng giải:', mailErr);
        }
      }

      return apiResponse({ success: true }, 'success', 'Gửi thông tin nhận giải thành công!', 200, request);
    }

    return apiResponse(null, 'error', 'Action không hợp lệ', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
