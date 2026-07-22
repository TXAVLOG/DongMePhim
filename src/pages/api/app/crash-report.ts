import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { crash_log, device_info, platform, os_version, timestamp } = body;

    const { error } = await supabase
      .from('client_errors')
      .insert({
        type: 'crash',
        message: crash_log || 'Uncaught mobile app crash',
        device_info: device_info || `${platform || 'Mobile'} (${os_version || 'N/A'})`,
        extra: {
          platform,
          os_version,
          timestamp,
          raw_body: body
        }
      });

    if (error) {
      console.error('Error inserting crash log into Supabase:', error);
    }

    return apiResponse({ success: true }, 'success', 'Crash report logged successfully', 200, request, true);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
