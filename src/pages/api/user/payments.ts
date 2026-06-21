import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { supabase } from '../../../lib/supabase';

// GET: Lấy lịch sử giao dịch thanh toán
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const username = url.searchParams.get('username');
    const txid = url.searchParams.get('txid');

    // 1. Nếu lấy theo mã giao dịch cụ thể
    if (txid) {
      const { data: log, error } = await supabase
        .from('txa_payment_logs')
        .select('*')
        .eq('txid', txid)
        .maybeSingle();

      if (error) throw error;
      if (!log) {
        return apiResponse(null, 'success', 'No record found', 200, request);
      }
      const mappedLog = {
        txid: log.txid,
        username: log.username,
        email: log.email || '',
        packageTitle: log.package_title,
        price: Number(log.price),
        cycle: log.cycle,
        method: log.method,
        status: log.status,
        receiptImg: log.receipt_img || '',
        date: log.created_at
      };
      return apiResponse(mappedLog, 'success', '', 200, request);
    }

    // 2. Nếu lấy danh sách giao dịch cho admin hoặc người dùng cụ thể
    let query = supabase.from('txa_payment_logs').select('*').order('created_at', { ascending: false });

    // Nếu không phải admin (username !== 'admin') và có username -> Lọc theo username
    if (username && username !== 'admin') {
      query = query.eq('username', username);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    // Ánh xạ lại cấu trúc ngày tháng cũ cho tương thích với client-side
    const mappedLogs = (logs || []).map((l: any) => ({
      txid: l.txid,
      username: l.username,
      email: l.email || '',
      packageTitle: l.package_title,
      price: Number(l.price),
      cycle: l.cycle,
      method: l.method,
      status: l.status,
      receiptImg: l.receipt_img || '',
      date: l.created_at
    }));

    return apiResponse(mappedLogs, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Lưu hoặc cập nhật lịch sử thanh toán
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as any;
    const { txid, username, email, packageTitle, price, cycle, method, status, receiptImg } = body;

    if (!txid || !username || !packageTitle) {
      return apiResponse(null, 'error', 'Missing txid, username or packageTitle', 400, request);
    }

    const { error } = await supabase
      .from('txa_payment_logs')
      .upsert({
        txid,
        username,
        email: email || null,
        package_title: packageTitle,
        price: Number(price) || 0,
        cycle: cycle || 'monthly',
        method: method || 'manual',
        status: status || 'pending',
        receipt_img: receiptImg || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'txid' });

    if (error) throw error;

    return apiResponse({ success: true }, 'success', 'Lưu nhật ký giao dịch thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
