import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';
import { SmtpClient } from '@lib/api/smtpClient';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const id = url.searchParams.get('id');
    const getClaims = url.searchParams.get('claims');
    const settings = await SettingService.getSettings();
    const events = (settings as any).lucky_draw_events || [];

    if (getClaims === 'true') {
      const allClaims: any[] = [];
      events.forEach((e: any) => {
        if (e.claimedPrizes && Array.isArray(e.claimedPrizes)) {
          e.claimedPrizes.forEach((c: any) => {
            allClaims.push({ ...c, eventId: e.id, eventTitle: e.title });
          });
        }
      });
      allClaims.sort((a, b) => new Date(b.claimedAt || 0).getTime() - new Date(a.claimedAt || 0).getTime());
      return apiResponse(allClaims, 'success', '', 200, request);
    }

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
    const { action, event, id, phone, winnerName, prizeName, claimId, status, username } = body;
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
        events.push({ status: 'active', maxSpinsPerUser: 0, spinLimitType: 'total', ...event, created_at: new Date().toISOString() });
      }

      await SettingService.updateSettings({ lucky_draw_events: events } as any);
      return apiResponse({ success: true, events }, 'success', 'Lưu cấu hình sự kiện thành công!', 200, request);
    }

    if (action === 'toggle_status' && id) {
      const index = events.findIndex((e: any) => e.id === id);
      if (index >= 0) {
        events[index].status = events[index].status === 'paused' ? 'active' : 'paused';
        await SettingService.updateSettings({ lucky_draw_events: events } as any);
        return apiResponse({ success: true, status: events[index].status }, 'success', 'Cập nhật trạng thái thành công!', 200, request);
      }
      return apiResponse(null, 'error', 'Sự kiện không tồn tại', 404, request);
    }

    if (action === 'reset_history' && id) {
      const index = events.findIndex((e: any) => e.id === id);
      if (index >= 0) {
        events[index].winners = [];
        events[index].participantsCount = 0;
        if (Array.isArray(events[index].prizes)) {
          events[index].prizes.forEach((p: any) => p.wonQuantity = 0);
        }
        await SettingService.updateSettings({ lucky_draw_events: events } as any);
        return apiResponse({ success: true }, 'success', 'Đã reset lịch sử sự kiện!', 200, request);
      }
      return apiResponse(null, 'error', 'Sự kiện không tồn tại', 404, request);
    }

    if (action === 'delete_event' && id) {
      events = events.filter((e: any) => e.id !== id);
      await SettingService.updateSettings({ lucky_draw_events: events } as any);
      return apiResponse({ success: true, events }, 'success', 'Xóa sự kiện thành công!', 200, request);
    }

    if (action === 'record_spin') {
      const { eventId, prize, username } = body;
      const index = events.findIndex((e: any) => e.id === eventId);
      if (index < 0) return apiResponse(null, 'error', 'Sự kiện không tồn tại', 404, request);

      const ev = events[index];
      if (ev.status === 'paused') {
        return apiResponse(null, 'error', 'Sự kiện hiện đang tạm dừng!', 400, request);
      }

      // Check user spin limit
      const maxSpins = parseInt(ev.maxSpinsPerUser || 0);
      if (maxSpins > 0 && username) {
        const winners = ev.winners || [];
        const userWins = winners.filter((w: any) => {
          if (w.username !== username) return false;
          if (ev.spinLimitType === 'daily') {
            const todayStr = new Date().toISOString().slice(0, 10);
            const winDateStr = new Date(w.wonAt || Date.now()).toISOString().slice(0, 10);
            return todayStr === winDateStr;
          }
          return true;
        });
        if (userWins.length >= maxSpins) {
          return apiResponse(null, 'error', `Bạn đã hết lượt quay (${userWins.length}/${maxSpins} lượt)!`, 400, request);
        }
      }

      // Update prize won quantity
      if (!ev.winners) ev.winners = [];
      ev.winners.push({
        username: username || 'Khách',
        prizeName: prize.name,
        prizeType: prize.type,
        wonAt: new Date().toISOString()
      });
      ev.participantsCount = (ev.participantsCount || 0) + 1;

      if (Array.isArray(ev.prizes)) {
        const pIdx = ev.prizes.findIndex((p: any) => p.id === prize.id || p.name === prize.name);
        if (pIdx >= 0) {
          ev.prizes[pIdx].wonQuantity = (ev.prizes[pIdx].wonQuantity || 0) + 1;
        }
      }

      await SettingService.updateSettings({ lucky_draw_events: events } as any);
      return apiResponse({ success: true }, 'success', 'Ghi nhận lượt quay thành công!', 200, request);
    }

    if (action === 'claim_phone_prize') {
      const { eventId } = body;
      if (!phone || !winnerName || !prizeName) {
        return apiResponse(null, 'error', 'Thiếu thông tin nhận giải!', 400, request);
      }

      // Record claim into event
      const index = events.findIndex((e: any) => e.id === eventId);
      if (index >= 0) {
        if (!events[index].claimedPrizes) events[index].claimedPrizes = [];
        events[index].claimedPrizes.push({
          id: 'claim_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          phone,
          winnerName,
          prizeName,
          claimedAt: new Date().toISOString(),
          status: 'pending'
        });
        await SettingService.updateSettings({ lucky_draw_events: events } as any);
      }

      // Send email to admin
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

    if (action === 'update_claim_status' && claimId) {
      let updated = false;
      events.forEach((e: any) => {
        if (e.claimedPrizes) {
          const c = e.claimedPrizes.find((item: any) => item.id === claimId);
          if (c) {
            c.status = status || 'completed';
            updated = true;
          }
        }
      });
      if (updated) {
        await SettingService.updateSettings({ lucky_draw_events: events } as any);
        return apiResponse({ success: true }, 'success', 'Đã cập nhật trạng thái!', 200, request);
      }
      return apiResponse(null, 'error', 'Không tìm thấy yêu cầu nhận quà', 404, request);
    }

    if (action === 'delete_claim' && claimId) {
      events.forEach((e: any) => {
        if (e.claimedPrizes) {
          e.claimedPrizes = e.claimedPrizes.filter((item: any) => item.id !== claimId);
        }
      });
      await SettingService.updateSettings({ lucky_draw_events: events } as any);
      return apiResponse({ success: true }, 'success', 'Đã xóa yêu cầu!', 200, request);
    }

    if (action === 'bulk_update_claim_status' && Array.isArray(body.claimIds)) {
      const claimIds: string[] = body.claimIds;
      let count = 0;
      events.forEach((e: any) => {
        if (e.claimedPrizes) {
          e.claimedPrizes.forEach((c: any) => {
            if (claimIds.includes(c.id)) {
              c.status = status || 'completed';
              count++;
            }
          });
        }
      });
      await SettingService.updateSettings({ lucky_draw_events: events } as any);
      return apiResponse({ success: true, count }, 'success', `Đã cập nhật ${count} yêu cầu!`, 200, request);
    }

    if (action === 'bulk_delete_claims' && Array.isArray(body.claimIds)) {
      const claimIds: string[] = body.claimIds;
      events.forEach((e: any) => {
        if (e.claimedPrizes) {
          e.claimedPrizes = e.claimedPrizes.filter((item: any) => !claimIds.includes(item.id));
        }
      });
      await SettingService.updateSettings({ lucky_draw_events: events } as any);
      return apiResponse({ success: true }, 'success', `Đã xóa các yêu cầu đã chọn!`, 200, request);
    }

    return apiResponse(null, 'error', 'Action không hợp lệ', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

