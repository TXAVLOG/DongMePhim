import { supabase } from '@lib/supabase';

export interface ZaloAccessRequest {
  id?: string;
  token: string;
  nickname: string;
  email?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZaloBypass {
  id?: string;
  type: 'user' | 'token' | 'ip' | 'nickname';
  value: string;
  description?: string | null;
  createdAt?: string;
}

export const ZaloService = {
  // 1. Gửi yêu cầu duyệt Zalo
  async submitZaloAccessRequest(request: ZaloAccessRequest): Promise<ZaloAccessRequest> {
    try {
      const { data, error } = await supabase
        .from('zalo_access')
        .upsert({
          token: request.token,
          nickname: request.nickname,
          email: request.email || null,
          status: request.status || 'pending',
          ip: request.ip || null,
          user_agent: request.userAgent || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'token' })
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        token: data.token,
        nickname: data.nickname,
        email: data.email,
        status: data.status,
        ip: data.ip,
        userAgent: data.user_agent,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (e) {
      console.error('Lỗi khi gửi yêu cầu Zalo lên Supabase:', e);
      throw e;
    }
  },

  // 2. Lấy yêu cầu duyệt Zalo theo token
  async getZaloAccessByToken(token: string): Promise<ZaloAccessRequest | null> {
    try {
      const { data, error } = await supabase
        .from('zalo_access')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (error || !data) return null;
      return {
        id: data.id,
        token: data.token,
        nickname: data.nickname,
        email: data.email,
        status: data.status,
        ip: data.ip,
        userAgent: data.user_agent,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (e) {
      console.error('Lỗi khi lấy yêu cầu Zalo từ Supabase:', e);
      return null;
    }
  },

  // 3. Lấy tất cả yêu cầu duyệt Zalo (Admin)
  async getAllZaloAccessRequests(): Promise<ZaloAccessRequest[]> {
    try {
      const { data, error } = await supabase
        .from('zalo_access')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        token: row.token,
        nickname: row.nickname,
        email: row.email,
        status: row.status,
        ip: row.ip,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (e) {
      console.error('Lỗi khi lấy danh sách yêu cầu Zalo:', e);
      return [];
    }
  },

  // 4. Cập nhật trạng thái yêu cầu duyệt Zalo (Admin)
  async updateZaloAccessStatus(idOrToken: string, status: 'approved' | 'rejected' | 'pending'): Promise<void> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrToken);
      
      const query = supabase
        .from('zalo_access')
        .update({
          status,
          updated_at: new Date().toISOString()
        });

      const { error } = await (isUuid 
        ? query.eq('id', idOrToken) 
        : query.eq('token', idOrToken));

      if (error) throw error;
    } catch (e) {
      console.error('Lỗi khi cập nhật trạng thái Zalo trên Supabase:', e);
    }
  },

  // 5. Xóa yêu cầu duyệt Zalo (Admin)
  async deleteZaloAccessRequest(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('zalo_access')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error('Lỗi khi xóa yêu cầu Zalo trên Supabase:', e);
    }
  },

  // 6. Kiểm tra xem người dùng có được bypass duyệt Zalo không
  async checkZaloBypass(token: string | null, ip: string | null, username: string | null, email: string | null): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('zalo_bypass')
        .select('*');

      if (error || !data || data.length === 0) return false;

      return data.some((row: any) => {
        if (row.type === 'token' && token && row.value === token) return true;
        if (row.type === 'ip' && ip && row.value === ip) return true;
        if (row.type === 'user' && (
          (username && row.value.toLowerCase() === username.toLowerCase()) ||
          (email && row.value.toLowerCase() === email.toLowerCase())
        )) return true;
        return false;
      });
    } catch (e) {
      console.error('Lỗi khi kiểm tra bypass Zalo từ Supabase:', e);
      return false;
    }
  },

  // 7. Lấy danh sách Whitelist bypass Zalo
  async getZaloBypasses(): Promise<ZaloBypass[]> {
    try {
      const { data, error } = await supabase
        .from('zalo_bypass')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        type: row.type as 'user' | 'token' | 'ip' | 'nickname',
        value: row.value,
        description: row.description,
        createdAt: row.created_at
      }));
    } catch (e) {
      console.error('Lỗi khi lấy danh sách bypass:', e);
      return [];
    }
  },

  // 8. Thêm mới Whitelist bypass Zalo
  async createZaloBypass(bypass: ZaloBypass): Promise<ZaloBypass> {
    try {
      const { data, error } = await supabase
        .from('zalo_bypass')
        .insert({
          type: bypass.type,
          value: bypass.value,
          description: bypass.description || null
        })
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        type: data.type as 'user' | 'token' | 'ip' | 'nickname',
        value: data.value,
        description: data.description,
        createdAt: data.created_at
      };
    } catch (e) {
      console.error('Lỗi khi thêm mới bypass lên Supabase:', e);
      throw e;
    }
  },

  // 9. Xóa Whitelist bypass Zalo
  async deleteZaloBypass(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('zalo_bypass')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error('Lỗi khi xóa bypass trên Supabase:', e);
    }
  },

  // 10. Tạo mã Key Bypass dạng DPxxxxxx
  generateBypassCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DP';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  // 11. Cấp mã Key Bypass Zalo mới
  async createBypassKey(data: { packageTitle?: string; durationMonths?: number; email?: string; note?: string; maxDevices?: number }): Promise<any> {
    const keyCode = this.generateBypassCode();
    const durationMonths = data.durationMonths ? Number(data.durationMonths) : 1;
    const maxDevices = data.maxDevices ? Number(data.maxDevices) : 15;
    const expiryDate = new Date(Date.now() + durationMonths * 30 * 24 * 3600 * 1000).toISOString();

    const { data: dbData, error } = await supabase
      .from('txa_zalo_bypass_keys')
      .insert({
        key_code: keyCode,
        package_title: data.packageTitle || 'Gói Key Bypass Zalo',
        recipient_email: data.email || null,
        note: data.note || null,
        duration_months: durationMonths,
        max_devices: maxDevices,
        expiry_date: expiryDate,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Lỗi insert key bypass Supabase:', error);
      throw new Error(error.message || 'Lỗi khi tạo mã Key Bypass trên CSDL');
    }
    return {
      ...dbData,
      email: dbData.recipient_email,
      used_count: 0
    };
  },

  // 12. Lấy tất cả danh sách Key Bypass
  async getAllBypassKeys(): Promise<any[]> {
    try {
      const { data: keys, error } = await supabase
        .from('txa_zalo_bypass_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !keys) return [];

      const { data: logs } = await supabase
        .from('txa_zalo_key_logs')
        .select('key_code, browser_token');

      const deviceCounts: Record<string, Set<string>> = {};
      if (logs) {
        for (const l of logs) {
          if (!deviceCounts[l.key_code]) deviceCounts[l.key_code] = new Set();
          if (l.browser_token) deviceCounts[l.key_code].add(l.browser_token);
        }
      }

      return keys.map((k: any) => ({
        ...k,
        email: k.recipient_email,
        used_count: deviceCounts[k.key_code] ? deviceCounts[k.key_code].size : 0
      }));
    } catch (err) {
      console.error('Supabase getAllBypassKeys error:', err);
      return [];
    }
  },

  // 13. Lấy chi tiết Key và danh sách Browser Tokens sử dụng
  async getKeyDetailsWithLogs(keyIdOrCode: string): Promise<{ key: any; logs: any[] }> {
    try {
      let keyObj = null;
      const { data: kDataById } = await supabase
        .from('txa_zalo_bypass_keys')
        .select('*')
        .eq('id', keyIdOrCode)
        .maybeSingle();

      if (kDataById) {
        keyObj = kDataById;
      } else {
        const { data: kDataByCode } = await supabase
          .from('txa_zalo_bypass_keys')
          .select('*')
          .eq('key_code', keyIdOrCode)
          .maybeSingle();
        keyObj = kDataByCode;
      }

      let logsList: any[] = [];
      if (keyObj) {
        const { data: lData } = await supabase
          .from('txa_zalo_key_logs')
          .select('*')
          .eq('key_code', keyObj.key_code)
          .order('used_at', { ascending: false });

        if (lData) {
          logsList = lData.map((l: any) => ({
            ...l,
            created_at: l.created_at || l.used_at
          }));
        }
      }

      return {
        key: keyObj ? { ...keyObj, email: keyObj.recipient_email } : null,
        logs: logsList
      };
    } catch (err) {
      console.error('Supabase getKeyDetailsWithLogs error:', err);
      return { key: null, logs: [] };
    }
  },

  // 14. Kiểm tra mã Key Bypass và gán tự động vào Browser Token
  async verifyAndApplyBypassKey(keyCode: string, browserToken: string, nickname: string, ip: string, userAgent: string): Promise<{ success: boolean; message: string; key?: any }> {
    const cleanKey = (keyCode || '').trim().toUpperCase();
    if (!cleanKey.startsWith('DP') || cleanKey.length !== 8) {
      return { success: false, message: 'Mã Key Bypass phải đúng 8 ký tự và bắt đầu bằng "DP"!' };
    }

    try {
      const { data: keyRecord, error: kErr } = await supabase
        .from('txa_zalo_bypass_keys')
        .select('*')
        .eq('key_code', cleanKey)
        .maybeSingle();

      if (kErr || !keyRecord) {
        return { success: false, message: 'Mã Key Bypass không tồn tại hoặc không hợp lệ!' };
      }

      if (keyRecord.status !== 'active') {
        return { success: false, message: `Mã Key này hiện đang ở trạng thái "${keyRecord.status}" và không thể sử dụng!` };
      }

      const expTime = new Date(keyRecord.expiry_date).getTime();
      if (Date.now() > expTime) {
        await supabase.from('txa_zalo_bypass_keys').update({ status: 'expired' }).eq('id', keyRecord.id);
        return { success: false, message: 'Mã Key Bypass đã hết hạn sử dụng!' };
      }

      const { data: keyLogs } = await supabase
        .from('txa_zalo_key_logs')
        .select('*')
        .eq('key_code', cleanKey);

      const maxAllowed = keyRecord.max_devices || 15;
      const existingTokens = new Set((keyLogs || []).map((l: any) => l.browser_token));

      if (!existingTokens.has(browserToken) && existingTokens.size >= maxAllowed) {
        return { success: false, message: `Mã Key đã đạt giới hạn tối đa ${maxAllowed} thiết bị sử dụng. Vui lòng sử dụng hoặc mua mã Key mới!` };
      }

      if (!existingTokens.has(browserToken)) {
        await supabase.from('txa_zalo_key_logs').insert({
          key_code: cleanKey,
          browser_token: browserToken,
          nickname: nickname || 'Khách',
          ip: ip || null,
          user_agent: userAgent || null
        });
      }

      await this.submitZaloAccessRequest({
        token: browserToken,
        nickname: nickname || 'Khách Bypass DP',
        status: 'approved',
        ip,
        userAgent
      });
      await this.updateZaloAccessStatus(browserToken, 'approved');

      return { success: true, message: 'Xác thực mã Key Bypass hợp lệ! Đã tự động phê duyệt truy cập.', key: keyRecord };
    } catch (err: any) {
      console.error('Supabase verifyAndApplyBypassKey error:', err);
      return { success: false, message: err.message || 'Lỗi khi xác thực Key' };
    }
  },

  // 15. Khóa / thu hồi Key Bypass
  async revokeBypassKey(keyIdOrCode: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('txa_zalo_bypass_keys')
        .update({ status: 'revoked' })
        .eq('id', keyIdOrCode);

      if (error) {
        await supabase
          .from('txa_zalo_bypass_keys')
          .update({ status: 'revoked' })
          .eq('key_code', keyIdOrCode);
      }
    } catch (err) {
      console.error('Lỗi thu hồi key Supabase:', err);
    }
  }
};
