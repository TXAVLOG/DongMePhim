import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifySession } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { buildPushPayload } from '@block65/webcrypto-web-push';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Xác thực quyền Admin
    const currentUser = await verifySession(request, cookies);
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.roles === 'admin');
    if (!isAdmin) {
      return apiResponse(null, 'error', 'Quyền truy cập bị từ chối!', 403, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { title, bodyText, url, icon, image } = body;
    if (!title || !bodyText) {
      return apiResponse(null, 'error', 'Thiếu tiêu đề (title) hoặc nội dung (bodyText)!', 400, request);
    }

    // 2. Lấy cấu hình VAPID từ cài đặt (hoặc sử dụng khoá mặc định đã sinh từ CLI)
    const settings: any = await SettingService.getSettings();
    const vapidPublicKey = settings.pwa?.vapid_public_key || 'BPHOzS5-cuqD7AnIzZVUFjWvBo2r5ETsJR7ir__O3FZaqsobABZFlcOJmV8nxVg1oQWQN2GNCdRjLZqGOOC__Ek';
    const vapidPrivateKey = settings.pwa?.vapid_private_key || 'p9vb7mscPUag8TWCaKbANy6Q5Gio9TGcFIcM_6mzj6c';
    const vapidSubject = settings.general?.site_url || 'mailto:admin@dongmephim.online';

    // 3. Truy xuất toàn bộ thiết bị đã đăng ký nhận thông báo
    const { data: subscriptions, error } = await supabase
      .from('txa_push_subscriptions')
      .select('*');

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return apiResponse({ sentCount: 0 }, 'success', 'Không có thiết bị đăng ký nhận thông báo nào.', 200, request);
    }

    // 4. Chuẩn bị payload thông báo
    const notificationPayload = {
      title,
      body: bodyText,
      url: url || '/tphim',
      icon: icon || '/icon-192x192.png',
      image: image || undefined
    };

    const vapidKeys = {
      subject: vapidSubject,
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey
    };

    let successCount = 0;
    let failCount = 0;
    const failedIds: string[] = [];

    // Gửi thông báo song song theo lô (batchSize = 5) để tránh quá tải kết nối HTTP
    const batchSize = 5;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      await Promise.all(batch.map(async (subRecord) => {
        try {
          const sub = subRecord.subscription;
          
          // Mã hoá và ký VAPID JWT header (độ dài TTL mặc định là 24 giờ)
          const pushPayload = await buildPushPayload(
            { data: JSON.stringify(notificationPayload) },
            sub,
            vapidKeys
          );

          // Gửi POST tới máy chủ đẩy (Google FCM, Mozilla, Apple Push, v.v.)
          const res = await fetch(sub.endpoint, pushPayload as any);
          if (res.ok) {
            successCount++;
          } else {
            console.warn(`[PWA Push] Đẩy thất bại (status: ${res.status}) cho endpoint:`, sub.endpoint);
            failCount++;
            // Nếu subscription đã hết hạn hoặc không tồn tại (404 hoặc 410) -> Thêm vào danh sách xoá dọn dẹp
            if (res.status === 404 || res.status === 410) {
              failedIds.push(subRecord.id);
            }
          }
        } catch (pushErr) {
          console.error(`[PWA Push] Lỗi kết nối gửi push cho id ${subRecord.id}:`, pushErr);
          failCount++;
        }
      }));
    }

    // 5. Dọn dẹp các subscription đã chết
    if (failedIds.length > 0) {
      await supabase
        .from('txa_push_subscriptions')
        .delete()
        .in('id', failedIds);
    }

    return apiResponse({
      successCount,
      failCount,
      totalCount: subscriptions.length,
      cleanedCount: failedIds.length
    }, 'success', `Gửi push hoàn tất! Thành công: ${successCount}, Thất bại: ${failCount}, Đã dọn dẹp: ${failedIds.length}`, 200, request);

  } catch (err: any) {
    console.error('[API] Push Broadcast Error:', err);
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
