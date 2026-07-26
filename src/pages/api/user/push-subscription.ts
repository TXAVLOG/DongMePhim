import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifySession } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { subscription, username, deviceInfo } = body;
    if (!subscription || !subscription.endpoint) {
      return apiResponse(null, 'error', 'Thiếu thông tin đăng ký (subscription)!', 400, request);
    }

    // 1. Xử lý lấy User ID (ưu tiên từ session đang đăng nhập, sau đó fallback tìm theo username)
    let userId: string | null = null;
    try {
      const currentUser = await verifySession(request, cookies);
      if (currentUser && currentUser.id) {
        userId = currentUser.id;
      }
    } catch (e) {}

    if (!userId && username) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (user) {
        userId = user.id;
      }
    }

    // 2. Tìm kiếm subscription đã có cùng endpoint để tránh duplicate
    // Thực hiện truy vấn JSONB trên postgresql
    const { data: existing } = await supabase
      .from('txa_push_subscriptions')
      .select('id')
      .eq('subscription->>endpoint', subscription.endpoint)
      .maybeSingle();

    if (existing) {
      // Cập nhật subscription cũ
      const { error } = await supabase
        .from('txa_push_subscriptions')
        .update({
          user_id: userId,
          subscription: subscription,
          device_info: deviceInfo || null
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Thêm mới subscription
      const { error } = await supabase
        .from('txa_push_subscriptions')
        .insert({
          user_id: userId,
          subscription: subscription,
          device_info: deviceInfo || null
        });

      if (error) throw error;
    }

    return apiResponse({ success: true }, 'success', 'Đăng ký nhận thông báo thành công!', 200, request);
  } catch (err: any) {
    console.error('[API] Push Subscription Error:', err);
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
