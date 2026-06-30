import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { MovieService } from '@services/MovieService';

// GET: Lấy danh sách quốc gia từ DB
export const GET: APIRoute = async ({ request }) => {
  try {
    const { countries } = await MovieService.getGenresAndCountries();
    // Return list of countries formatted
    const formatted = countries.map(c => ({
      name: c,
      slug: c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
    }));
    return apiResponse(formatted, 'success', 'Lấy danh sách quốc gia thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Thêm mới, Chỉnh sửa, Xóa quốc gia
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { action, oldName, newName } = body;
    if (!action) {
      return apiResponse(null, 'error', 'Thiếu hành động (action)!', 400, request);
    }

    if (action === 'update') {
      if (!oldName || !newName) {
        return apiResponse(null, 'error', 'Thiếu tên quốc gia cũ hoặc mới!', 400, request);
      }

      // Update all movies that have oldName as country (broadcast_at column)
      const { data, error } = await supabase
        .from('movies')
        .update({ broadcast_at: newName.normalize('NFC').trim() })
        .eq('broadcast_at', oldName.normalize('NFC').trim());

      if (error) throw error;
      
      // Clear Service cache to reflect changes immediately
      MovieService.clearCache();

      return apiResponse(data, 'success', 'Cập nhật quốc gia thành công!', 200, request);
    }

    if (action === 'delete') {
      if (!oldName) {
        return apiResponse(null, 'error', 'Thiếu tên quốc gia cần xóa!', 400, request);
      }

      // Update all movies that have oldName to 'Khác'
      const { data, error } = await supabase
        .from('movies')
        .update({ broadcast_at: 'Khác' })
        .eq('broadcast_at', oldName.normalize('NFC').trim());

      if (error) throw error;

      // Clear Service cache to reflect changes immediately
      MovieService.clearCache();

      return apiResponse(data, 'success', 'Xóa quốc gia thành công!', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
