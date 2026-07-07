import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'check_status') {
      const deviceId = url.searchParams.get('device_id');
      const sessionId = url.searchParams.get('session_id');

      if (!deviceId && !sessionId) {
        return apiResponse(null, 'error', 'Thiếu device_id hoặc session_id!', 400, request);
      }

      let query = supabase.from('txa_tv_pairing_sessions').select('*');
      if (sessionId) {
        query = query.eq('id', sessionId);
      } else {
        query = query.eq('device_id', deviceId).order('created_at', { ascending: false }).limit(1);
      }

      const { data: session, error } = await query.maybeSingle();

      if (error || !session) {
        return apiResponse({ status: 'not_found' }, 'success', 'Không tìm thấy phiên ghép nối!', 200, request);
      }

      // Check expiry
      const isExpired = new Date() > new Date(session.expires_at);
      if (isExpired && session.status === 'pending') {
        await supabase
          .from('txa_tv_pairing_sessions')
          .update({ status: 'expired' })
          .eq('id', session.id);
        return apiResponse({ status: 'expired' }, 'success', 'Phiên ghép nối đã hết hạn!', 200, request);
      }

      return apiResponse({
        id: session.id,
        device_id: session.device_id,
        status: session.status,
        session_type: session.session_type,
        user_info: session.user_info,
        expires_at: session.expires_at,
        time_left_seconds: Math.max(0, Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000))
      }, 'success', '', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { action } = body;
    if (!action) {
      return apiResponse(null, 'error', 'Thiếu action trong yêu cầu!', 400, request);
    }

    // 1. REGISTER DEVICE (TV)
    if (action === 'register_device') {
      const { device_id, device_name, device_model, device_os, os_version, screen_resolution, ip_address } = body;
      if (!device_id || !device_name) {
        return apiResponse(null, 'error', 'Thiếu device_id hoặc device_name!', 400, request);
      }

      const { data: device, error } = await supabase
        .from('txa_tv_devices')
        .upsert({
          device_id,
          device_name,
          device_model: device_model || null,
          device_os: device_os || null,
          os_version: os_version || null,
          screen_resolution: screen_resolution || null,
          ip_address: ip_address || null,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'device_id' })
        .select()
        .single();

      if (error) throw error;
      return apiResponse(device, 'success', 'Đăng ký thiết bị thành công!', 200, request);
    }

    // 2. GENERATE PAIRING CODE (TV)
    if (action === 'generate_code') {
      const { device_id } = body;
      if (!device_id) {
        return apiResponse(null, 'error', 'Thiếu device_id!', 400, request);
      }

      // Generate a 4 digit code + TXTV prefix
      const random4 = Math.floor(1000 + Math.random() * 9000).toString();
      const fullCode = `TXTV${random4}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      // Insert new session
      const { data: session, error } = await supabase
        .from('txa_tv_pairing_sessions')
        .insert({
          device_id,
          pair_code: fullCode,
          session_type: 'code',
          status: 'pending',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update active pair code in device table
      await supabase
        .from('txa_tv_devices')
        .update({
          pair_code: fullCode,
          pair_code_expires_at: expiresAt.toISOString()
        })
        .eq('device_id', device_id);

      return apiResponse({
        session_id: session.id,
        pair_code: fullCode,
        expires_at: expiresAt.toISOString()
      }, 'success', 'Tạo mã pairing thành công!', 200, request);
    }

    // 3. GENERATE QR PAIRING (TV)
    if (action === 'generate_qr') {
      const { device_id, location_info } = body;
      if (!device_id) {
        return apiResponse(null, 'error', 'Thiếu device_id!', 400, request);
      }

      const qrToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds expiry as requested

      // Encrypted or plain payload: txa://{qr_token}?t={timestamp}&d={device_id}
      const qrPayload = `txa://${qrToken}?t=${Date.now()}&d=${device_id}`;

      const { data: session, error } = await supabase
        .from('txa_tv_pairing_sessions')
        .insert({
          device_id,
          pair_code: 'QR_SESSION',
          qr_token: qrToken,
          qr_payload: qrPayload,
          session_type: 'qr',
          status: 'pending',
          location_info: location_info || null,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return apiResponse({
        session_id: session.id,
        qr_token: qrToken,
        qr_payload: qrPayload,
        expires_at: expiresAt.toISOString()
      }, 'success', 'Tạo mã QR pairing thành công!', 200, request);
    }

    // --- Actions below require authentication (Mobile User) ---
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Vui lòng đăng nhập để thực hiện ghép nối!', 401, request);
    }

    // Helper: Create a new TV session token and update pairing session details
    const finalizePairing = async (session: any, clientUa: string) => {
      // 1. Generate access token for the TV
      const { data: userSession, error: sessionError } = await supabase
        .from('txa_user_sessions')
        .insert({
          user_id: user.id,
          user_agent: `TPhimX-App/TV-Client (${clientUa || 'unknown'})`,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select('session_token')
        .single();

      if (sessionError || !userSession) {
        throw new Error('Không tạo được token đăng nhập cho TV!');
      }

      // 2. Update pairing session to 'confirmed'
      const { error: updateSessionError } = await supabase
        .from('txa_tv_pairing_sessions')
        .update({
          status: 'confirmed',
          user_id: user.id,
          confirmed_at: new Date().toISOString(),
          user_info: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            access_token: userSession.session_token
          }
        })
        .eq('id', session.id);

      if (updateSessionError) throw updateSessionError;

      // 3. Update device owner in devices table
      await supabase
        .from('txa_tv_devices')
        .update({
          user_id: user.id,
          pair_code: null,
          pair_code_expires_at: null
        })
        .eq('device_id', session.device_id);
    };

    // 4. PAIR BY CODE (Mobile Input)
    if (action === 'pair_by_code') {
      const { pair_code } = body;
      if (!pair_code) {
        return apiResponse(null, 'error', 'Thiếu mã TV!', 400, request);
      }

      // Format code to uppercase
      const formattedCode = pair_code.toString().trim().toUpperCase();

      // Find pending session
      const { data: session, error } = await supabase
        .from('txa_tv_pairing_sessions')
        .select('*')
        .eq('pair_code', formattedCode)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !session) {
        return apiResponse(null, 'error', 'Mã xác nhận TV không hợp lệ hoặc đã hết hạn!', 400, request);
      }

      // Find TV details
      const { data: tvDevice } = await supabase
        .from('txa_tv_devices')
        .select('*')
        .eq('device_id', session.device_id)
        .maybeSingle();

      const clientUa = tvDevice ? `${tvDevice.device_name} / ${tvDevice.device_model}` : 'SmartTV';
      await finalizePairing(session, clientUa);

      return apiResponse(null, 'success', 'Ghép nối thành công!', 200, request);
    }

    // 5. PAIR BY QR (Mobile Scan)
    if (action === 'pair_by_qr') {
      const { qr_token } = body;
      if (!qr_token) {
        return apiResponse(null, 'error', 'Thiếu QR token!', 400, request);
      }

      // Find pending session
      const { data: session, error } = await supabase
        .from('txa_tv_pairing_sessions')
        .select('*')
        .eq('qr_token', qr_token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !session) {
        return apiResponse(null, 'error', 'Mã QR không hợp lệ hoặc đã hết hạn!', 400, request);
      }

      // Find TV details
      const { data: tvDevice } = await supabase
        .from('txa_tv_devices')
        .select('*')
        .eq('device_id', session.device_id)
        .maybeSingle();

      if (!tvDevice) {
        return apiResponse(null, 'error', 'Thiết bị TV không tồn tại!', 400, request);
      }

      // Update session status to 'waiting_confirm' so TV UI blurs and displays user details
      await supabase
        .from('txa_tv_pairing_sessions')
        .update({
          status: 'waiting_confirm',
          user_id: user.id,
          user_info: {
            id: user.id,
            username: user.username,
            name: user.name,
            avatar_url: user.avatar_url
          }
        })
        .eq('id', session.id);

      return apiResponse({
        session_id: session.id,
        tv_device: {
          device_name: tvDevice.device_name,
          device_model: tvDevice.device_model,
          ip_address: tvDevice.ip_address,
          device_os: tvDevice.device_os,
          location_info: session.location_info
        }
      }, 'success', 'Vui lòng xác nhận đăng nhập trên điện thoại!', 200, request);
    }

    // 6. CONFIRM PAIR (Mobile Confirm)
    if (action === 'confirm_pair') {
      const { session_id } = body;
      if (!session_id) {
        return apiResponse(null, 'error', 'Thiếu session_id!', 400, request);
      }

      const { data: session, error } = await supabase
        .from('txa_tv_pairing_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('status', 'waiting_confirm')
        .maybeSingle();

      if (error || !session) {
        return apiResponse(null, 'error', 'Phiên ghép nối không hợp lệ hoặc đã quá hạn!', 400, request);
      }

      // Find TV details
      const { data: tvDevice } = await supabase
        .from('txa_tv_devices')
        .select('*')
        .eq('device_id', session.device_id)
        .maybeSingle();

      const clientUa = tvDevice ? `${tvDevice.device_name} / ${tvDevice.device_model}` : 'SmartTV';
      await finalizePairing(session, clientUa);

      return apiResponse(null, 'success', 'Xác nhận đăng nhập thành công!', 200, request);
    }

    // 7. REJECT PAIR (Mobile Reject)
    if (action === 'reject_pair') {
      const { session_id } = body;
      if (!session_id) {
        return apiResponse(null, 'error', 'Thiếu session_id!', 400, request);
      }

      const { data: session, error } = await supabase
        .from('txa_tv_pairing_sessions')
        .select('*')
        .eq('id', session_id)
        .maybeSingle();

      if (error || !session) {
        return apiResponse(null, 'error', 'Phiên ghép nối không hợp lệ!', 400, request);
      }

      await supabase
        .from('txa_tv_pairing_sessions')
        .update({ status: 'rejected' })
        .eq('id', session_id);

      return apiResponse(null, 'success', 'Đã từ chối đăng nhập!', 200, request);
    }

    // 8. UNPAIR (Mobile/TV Disconnect)
    if (action === 'unpair') {
      const { device_id } = body;
      if (!device_id) {
        return apiResponse(null, 'error', 'Thiếu device_id!', 400, request);
      }

      // Clear owner in devices
      await supabase
        .from('txa_tv_devices')
        .update({ user_id: null })
        .eq('device_id', device_id);

      // Delete sessions
      await supabase
        .from('txa_tv_pairing_sessions')
        .delete()
        .eq('device_id', device_id);

      return apiResponse(null, 'success', 'Đã hủy ghép nối thiết bị!', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
