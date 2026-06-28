import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { type, message, device_info, extra } = body;

    const { error } = await supabase
      .from('client_errors')
      .insert({
        type: type || 'crash',
        message: message || 'No error message provided',
        device_info: device_info || request.headers.get('user-agent') || null,
        extra: extra || body || {}
      });

    if (error) {
      throw error;
    }

    return apiResponse({ success: true }, 'success', 'Client error logged successfully', 200, request, true);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
