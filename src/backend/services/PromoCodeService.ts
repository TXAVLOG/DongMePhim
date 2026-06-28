import { supabase } from '@lib/supabase';

export interface PromoCode {
  id?: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  package_scope: string; // 'all' hoặc tên gói cụ thể
  max_uses: number;
  used_count?: number;
  expiry_date: string;
  status: 'active' | 'disabled';
  created_at?: string;
}

export interface PromoCodeUse {
  id?: string;
  code: string;
  username: string;
  email?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  txid?: string | null;
  used_at?: string;
}

export const PromoCodeService = {
  // 1. Lấy tất cả danh sách mã giảm giá (Admin)
  async getAllPromoCodes(): Promise<PromoCode[]> {
    try {
      const { data, error } = await supabase
        .from('txa_promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        code: row.code,
        discount_type: row.discount_type,
        discount_value: Number(row.discount_value),
        package_scope: row.package_scope || 'all',
        max_uses: Number(row.max_uses),
        used_count: Number(row.used_count || 0),
        expiry_date: row.expiry_date,
        status: row.status,
        created_at: row.created_at
      }));
    } catch (e) {
      console.error('Lỗi khi lấy danh sách mã giảm giá từ Supabase:', e);
      return [];
    }
  },

  // 2. Tạo mới mã giảm giá (Admin)
  async createPromoCode(promo: PromoCode): Promise<PromoCode> {
    const cleanCode = (promo.code || '').trim().toUpperCase();
    if (!cleanCode) throw new Error('Mã giảm giá không được để trống!');

    const { data, error } = await supabase
      .from('txa_promo_codes')
      .insert({
        code: cleanCode,
        discount_type: promo.discount_type || 'percent',
        discount_value: Number(promo.discount_value) || 0,
        package_scope: promo.package_scope || 'all',
        max_uses: Number(promo.max_uses) || 100,
        expiry_date: promo.expiry_date,
        status: promo.status || 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      code: data.code,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value),
      package_scope: data.package_scope,
      max_uses: Number(data.max_uses),
      used_count: Number(data.used_count || 0),
      expiry_date: data.expiry_date,
      status: data.status,
      created_at: data.created_at
    };
  },

  // 3. Xóa mã giảm giá (Admin)
  async deletePromoCode(id: string): Promise<void> {
    const { error } = await supabase
      .from('txa_promo_codes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // 4. Bật/tắt trạng thái mã giảm giá (Admin)
  async togglePromoCode(id: string, status: 'active' | 'disabled'): Promise<void> {
    const { error } = await supabase
      .from('txa_promo_codes')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },

  // 5. Kiểm tra tính hợp lệ của mã giảm giá (User Checkout)
  async verifyAndApplyPromoCode(
    code: string,
    packageTitle: string,
    username: string,
    currentPrice: number
  ): Promise<{ success: boolean; message: string; discountAmount?: number; discountType?: string; discountValue?: number; codeObj?: PromoCode }> {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Vui lòng nhập mã giảm giá!' };
    }

    if (!cleanCode.startsWith('TX-')) {
      return { success: false, message: 'Định dạng mã không hợp lệ! Mã giảm giá phải bắt đầu bằng tiền tố TX- (Ví dụ: TX-TRIAN100).' };
    }

    // Lấy thông tin mã từ DB
    const { data: promo, error } = await supabase
      .from('txa_promo_codes')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (error || !promo) {
      return { success: false, message: 'Mã giảm giá không tồn tại hoặc không hợp lệ!' };
    }

    if (promo.status !== 'active') {
      return { success: false, message: 'Mã giảm giá này hiện đang tạm khóa hoặc đã tạm ngưng sử dụng!' };
    }

    // Kiểm tra thời hạn
    const expTime = new Date(promo.expiry_date).getTime();
    if (Date.now() > expTime) {
      return { success: false, message: 'Mã giảm giá đã hết thời hạn sử dụng!' };
    }

    // Kiểm tra số lượt dùng còn lại
    if (Number(promo.used_count || 0) >= Number(promo.max_uses)) {
      return { success: false, message: 'Mã giảm giá đã hết số lượt sử dụng tối đa!' };
    }

    // Kiểm tra Phạm vi gói cước (Package Scope)
    const scope = promo.package_scope || 'all';
    if (scope !== 'all') {
      const cleanScope = scope.toLowerCase();
      const cleanTitle = (packageTitle || '').toLowerCase();
      const isBypassScope = cleanScope.includes('bypass') || cleanScope.includes('zalo');
      const isBypassTitle = cleanTitle.includes('bypass') || cleanTitle.includes('zalo');

      let isMatch = false;
      if (isBypassScope && isBypassTitle) {
        isMatch = true;
      } else if (cleanScope === cleanTitle || cleanTitle.includes(cleanScope) || cleanScope.includes(cleanTitle)) {
        isMatch = true;
      }

      if (!isMatch) {
        return { 
          success: false, 
          message: `Mã giảm giá "${cleanCode}" chỉ áp dụng cho gói: ${scope}!` 
        };
      }
    }

    // Kiểm tra xem username đã từng dùng mã này chưa
    if (username && username !== 'guest') {
      const { data: existingUse } = await supabase
        .from('txa_promo_code_uses')
        .select('id')
        .eq('code', cleanCode)
        .eq('username', username)
        .maybeSingle();

      if (existingUse) {
        return { success: false, message: 'Tài khoản của bạn đã từng sử dụng mã giảm giá này rồi!' };
      }
    }

    // Tính toán số tiền được giảm
    let discountAmount = 0;
    const val = Number(promo.discount_value) || 0;
    if (promo.discount_type === 'percent') {
      discountAmount = Math.round((currentPrice * val) / 100);
    } else {
      discountAmount = val;
    }

    // Đảm bảo số tiền giảm giá không làm tổng tiền thanh toán xuống dưới 2,000đ (2k)
    const maxDiscountAllowed = Math.max(0, currentPrice - 2000);
    if (discountAmount > maxDiscountAllowed) {
      discountAmount = maxDiscountAllowed;
    }

    return {
      success: true,
      message: 'Áp dụng mã giảm giá thành công!',
      discountAmount,
      discountType: promo.discount_type,
      discountValue: val,
      codeObj: {
        id: promo.id,
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: val,
        package_scope: promo.package_scope,
        max_uses: promo.max_uses,
        used_count: promo.used_count,
        expiry_date: promo.expiry_date,
        status: promo.status
      }
    };
  },

  // 6. Ghi nhận lượt sử dụng mã giảm giá chính thức (khi thanh toán/hoàn tất)
  async recordPromoUsage(useData: PromoCodeUse): Promise<void> {
    const cleanCode = (useData.code || '').trim().toUpperCase();
    if (!cleanCode) return;

    try {
      // Insert log sử dụng
      await supabase.from('txa_promo_code_uses').insert({
        code: cleanCode,
        username: useData.username || 'guest',
        email: useData.email || null,
        ip: useData.ip || null,
        user_agent: useData.user_agent || null,
        txid: useData.txid || null
      });

      // Tăng lượt dùng used_count lên 1
      const { data: currentPromo } = await supabase
        .from('txa_promo_codes')
        .select('used_count')
        .eq('code', cleanCode)
        .single();

      if (currentPromo) {
        await supabase
          .from('txa_promo_codes')
          .update({ used_count: (currentPromo.used_count || 0) + 1 })
          .eq('code', cleanCode);
      }
    } catch (e) {
      console.error('Lỗi khi ghi nhận lượt sử dụng mã giảm giá:', e);
    }
  },

  // 7. Lấy danh sách các username/thiết bị đã dùng mã (Admin)
  async getPromoCodeUsers(code: string): Promise<PromoCodeUse[]> {
    const cleanCode = (code || '').trim().toUpperCase();
    try {
      const { data, error } = await supabase
        .from('txa_promo_code_uses')
        .select('*')
        .eq('code', cleanCode)
        .order('used_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        code: row.code,
        username: row.username,
        email: row.email,
        ip: row.ip,
        user_agent: row.user_agent,
        txid: row.txid,
        used_at: row.used_at
      }));
    } catch (e) {
      console.error('Lỗi khi lấy danh sách người dùng mã giảm giá:', e);
      return [];
    }
  }
};
