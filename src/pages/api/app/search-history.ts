import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const user = await verifyUserFromRequest(request, cookies);
    const deviceFingerprint = request.headers.get('x-device-fingerprint') || url.searchParams.get('device_fingerprint') || '';

    if (!user && !deviceFingerprint) {
      return apiResponse([], 'success', 'No user or device identifier provided', 200, request);
    }

    let query = supabase
      .from('txa_search_history')
      .select('id, keyword, updated_at')
      .order('updated_at', { ascending: false })
      .limit(15);

    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.eq('device_fingerprint', deviceFingerprint);
    }

    const { data, error } = await query;
    if (error) throw error;

    const keywords = (data || []).map((item: any) => item.keyword);
    return apiResponse(keywords, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi lấy lịch sử tìm kiếm', 500, request);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const keyword = (body.keyword || '').toString().trim();
    if (!keyword) {
      return apiResponse(null, 'error', 'Từ khóa không được để trống', 400, request);
    }

    const user = await verifyUserFromRequest(request, cookies);
    const deviceFingerprint = request.headers.get('x-device-fingerprint') || body.device_fingerprint || '';

    if (!user && !deviceFingerprint) {
      return apiResponse(null, 'error', 'Cần user_id hoặc device_fingerprint để lưu lịch sử', 400, request);
    }

    // Check if keyword already exists for this user / device
    let findQuery = supabase.from('txa_search_history').select('id');
    if (user) {
      findQuery = findQuery.eq('user_id', user.id).ilike('keyword', keyword);
    } else {
      findQuery = findQuery.eq('device_fingerprint', deviceFingerprint).ilike('keyword', keyword);
    }

    const { data: existingList } = await findQuery.limit(1);

    if (existingList && existingList.length > 0) {
      // Update timestamp to bring to top
      await supabase
        .from('txa_search_history')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existingList[0].id);
    } else {
      // Insert new search history
      await supabase
        .from('txa_search_history')
        .insert({
          user_id: user ? user.id : null,
          device_fingerprint: user ? null : deviceFingerprint,
          keyword: keyword,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    return apiResponse({ success: true, keyword }, 'success', 'Đã lưu lịch sử tìm kiếm', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi lưu lịch sử tìm kiếm', 500, request);
  }
};

export const DELETE: APIRoute = async ({ request, cookies, url }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const keyword = body.keyword || url.searchParams.get('keyword') || '';
    const clearAll = body.clear_all === true || url.searchParams.get('clear_all') === 'true';

    const user = await verifyUserFromRequest(request, cookies);
    const deviceFingerprint = request.headers.get('x-device-fingerprint') || body.device_fingerprint || url.searchParams.get('device_fingerprint') || '';

    if (!user && !deviceFingerprint) {
      return apiResponse(null, 'error', 'Cần user_id hoặc device_fingerprint', 400, request);
    }

    let deleteQuery = supabase.from('txa_search_history').delete();
    if (user) {
      deleteQuery = deleteQuery.eq('user_id', user.id);
    } else {
      deleteQuery = deleteQuery.eq('device_fingerprint', deviceFingerprint);
    }

    if (!clearAll && keyword) {
      deleteQuery = deleteQuery.ilike('keyword', keyword.trim());
    }

    const { error } = await deleteQuery;
    if (error) throw error;

    return apiResponse({ success: true }, 'success', 'Đã xóa lịch sử tìm kiếm', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi xóa lịch sử tìm kiếm', 500, request);
  }
};
