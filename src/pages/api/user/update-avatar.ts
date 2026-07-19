import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifySession } from '@lib/auth';
import { SettingService } from '@services/SettingService';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Verify user session
    const currentUser = await verifySession(request, cookies);
    if (!currentUser) {
      return apiResponse(null, 'error', 'Bạn chưa đăng nhập!', 401, request);
    }

    // 2. Parse request body
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { avatar } = body;
    if (!avatar) {
      return apiResponse(null, 'error', 'Thiếu dữ liệu ảnh đại diện!', 400, request);
    }

    // Must be a valid base64 data URL or hex/plain base64
    if (!avatar.startsWith('data:image/') && !avatar.startsWith('http')) {
      return apiResponse(null, 'error', 'Định dạng ảnh không hợp lệ! Phải là Base64 Data URL.', 400, request);
    }

    // 3. Fetch user's package limit from settings
    const settings = await SettingService.getSettings();
    const userPackageName = currentUser.package || 'free';
    
    // Find matching package
    const userPackage = settings.packages?.find((p: any) => 
      (p.id || '').toLowerCase() === userPackageName.toLowerCase() || 
      (p.title || '').toLowerCase() === userPackageName.toLowerCase()
    );

    // Limit value: defaults to -1 (unlimited) if not configured
    const limit = userPackage?.permissions?.max_avatar_changes_per_month ?? -1;

    // 4. Check change count and timestamp
    const now = new Date();
    let currentCount = currentUser.avatar_change_count || 0;
    const lastChanged = currentUser.last_avatar_changed_at ? new Date(currentUser.last_avatar_changed_at) : null;

    let isNewMonth = false;
    if (!lastChanged || lastChanged.getMonth() !== now.getMonth() || lastChanged.getFullYear() !== now.getFullYear()) {
      isNewMonth = true;
      currentCount = 0;
    }

    if (limit !== -1 && currentCount >= limit) {
      return apiResponse(
        { limit, currentCount }, 
        'error', 
        `Bạn đã đạt giới hạn đổi ảnh đại diện trong tháng này (Tối đa ${limit} lần với gói ${userPackage?.title || userPackageName})!`, 
        400, 
        request
      );
    }

    // 5. Update user database record
    const nextCount = currentCount + 1;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        avatar_url: avatar,
        avatar_change_count: nextCount,
        last_avatar_changed_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', currentUser.id);

    if (updateError) {
      throw updateError;
    }

    return apiResponse({
      success: true,
      avatarUrl: avatar,
      avatarChangeCount: nextCount,
      limit: limit
    }, 'success', 'Cập nhật ảnh đại diện thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
