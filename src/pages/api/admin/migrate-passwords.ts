import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifySession } from '@lib/auth';
import { encryptPassword, decryptPassword, isEncrypted } from '@lib/passwordCrypto';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Verify admin session
    const currentUser = await verifySession(request, cookies);
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.roles === 'admin');

    if (!isAdmin) {
      return apiResponse(null, 'error', 'Bạn không có quyền thực hiện hành động này!', 403, request);
    }

    // 2. Parse body parameters
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { oldKey, newKey } = body;
    if (!newKey) {
      return apiResponse(null, 'error', 'Thiếu Secret Key mới!', 400, request);
    }

    // 3. Fetch all users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, password');

    if (error) {
      throw error;
    }

    let migrated = 0;
    let rotated = 0;
    let failed = 0;

    // 4. Migrate each user
    for (const u of users) {
      const currentPassword = u.password || '';

      if (isEncrypted(currentPassword)) {
        // If password is encrypted and oldKey is provided, attempt key rotation
        if (oldKey) {
          const decrypted = await decryptPassword(currentPassword, oldKey);
          if (decrypted !== null) {
            const reEncrypted = await encryptPassword(decrypted, newKey);
            const { error: updateError } = await supabase
              .from('users')
              .update({ password: reEncrypted })
              .eq('id', u.id);

            if (updateError) {
              failed++;
            } else {
              rotated++;
            }
          } else {
            // Decryption failed with the provided old key
            failed++;
          }
        }
      } else {
        // If password is plaintext, encrypt it using newKey
        const encrypted = await encryptPassword(currentPassword, newKey);
        const { error: updateError } = await supabase
          .from('users')
          .update({ password: encrypted })
          .eq('id', u.id);

        if (updateError) {
          failed++;
        } else {
          migrated++;
        }
      }
    }

    return apiResponse({
      success: true,
      migrated,
      rotated,
      failed,
      total: users.length
    }, 'success', `Đồng bộ mật khẩu thành công! (Mã hóa mới: ${migrated}, Xoay khóa: ${rotated}, Thất bại: ${failed})`, 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
