import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try { body = await request.json(); } catch (_) {}

    const {
      device_fingerprint,
      platform,
      device_name,
      device_model,
      device_brand,
      os_version,
      app_version,
      screen_resolution,
      locale,
      cpu_cores,
      is_rooted,
      is_physical_device,
      build_fingerprint,
      ip_address,
      user_id,
      username,
    } = body;

    if (!device_fingerprint || !platform) {
      return apiResponse(null, 'error', 'device_fingerprint và platform là bắt buộc', 400, request);
    }

    const now = new Date().toISOString();

    // Upsert device log — update last_seen + visit_count nếu đã tồn tại
    const { data: existing, error: fetchErr } = await supabase
      .from('txa_device_logs')
      .select('id, visit_count, is_blocked, block_reason')
      .eq('device_fingerprint', device_fingerprint)
      .maybeSingle();

    if (fetchErr) {
      console.error('[device-log] fetch error:', fetchErr.message);
    }

    if (existing) {
      // Update last_seen, visit_count, ip (có thể thay đổi), user linkage
      await supabase
        .from('txa_device_logs')
        .update({
          last_seen_at: now,
          visit_count: (existing.visit_count ?? 0) + 1,
          ip_address: ip_address ?? null,
          app_version,
          user_id: user_id ?? null,
          username: username ?? null,
          os_version,
        })
        .eq('device_fingerprint', device_fingerprint);

      return apiResponse(
        {
          is_blocked: existing.is_blocked ?? false,
          block_reason: existing.block_reason ?? null,
        },
        'success',
        'Device log updated',
        200,
        request,
        true
      );
    } else {
      // Insert mới
      const { error: insertErr } = await supabase
        .from('txa_device_logs')
        .insert({
          device_fingerprint,
          platform,
          device_name: device_name ?? null,
          device_model: device_model ?? null,
          device_brand: device_brand ?? null,
          os_version: os_version ?? null,
          app_version: app_version ?? null,
          screen_resolution: screen_resolution ?? null,
          locale: locale ?? null,
          cpu_cores: cpu_cores ?? null,
          is_rooted: is_rooted ?? false,
          is_physical_device: is_physical_device ?? true,
          build_fingerprint: build_fingerprint ?? null,
          ip_address: ip_address ?? null,
          user_id: user_id ?? null,
          username: username ?? null,
          is_blocked: false,
          first_seen_at: now,
          last_seen_at: now,
          visit_count: 1,
        });

      if (insertErr) {
        console.error('[device-log] insert error:', insertErr.message);
      }

      return apiResponse(
        { is_blocked: false, block_reason: null },
        'success',
        'Device log recorded',
        200,
        request,
        true
      );
    }
  } catch (err: any) {
    console.error('[device-log] error:', err);
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
