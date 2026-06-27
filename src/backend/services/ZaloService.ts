import { supabase } from '@lib/supabase';

// Lựa chọn provider dựa trên biến môi trường ENV (mặc định 'local')
const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'local';

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
    if (providerType === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('zalo_access')
          .upsert({
            token: request.token,
            nickname: request.nickname,
            email: request.email || null,
            status: 'pending',
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
    } else {
      // Fallback LocalStorage
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const list = JSON.parse(localStorage.getItem('txa_zalo_access') || '[]');
        const idx = list.findIndex((x: any) => x.token === request.token);
        const newItem: ZaloAccessRequest = {
          id: request.token,
          token: request.token,
          nickname: request.nickname,
          email: request.email || null,
          status: 'pending',
          ip: request.ip || null,
          userAgent: request.userAgent || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (idx !== -1) {
          list[idx] = newItem;
        } else {
          list.push(newItem);
        }
        localStorage.setItem('txa_zalo_access', JSON.stringify(list));
        return newItem;
      }
      throw new Error('Chưa hỗ trợ local storage ở server-side');
    }
  },

  // 2. Lấy yêu cầu duyệt Zalo theo token
  async getZaloAccessByToken(token: string): Promise<ZaloAccessRequest | null> {
    if (providerType === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('zalo_access')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;
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
    } else {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const list = JSON.parse(localStorage.getItem('txa_zalo_access') || '[]');
        const found = list.find((x: any) => x.token === token);
        return found || null;
      }
      return null;
    }
  },

  // 3. Lấy tất cả yêu cầu duyệt Zalo (Admin)
  async getAllZaloAccessRequests(): Promise<ZaloAccessRequest[]> {
    if (providerType === 'supabase') {
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
    } else {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return JSON.parse(localStorage.getItem('txa_zalo_access') || '[]');
      }
      return [];
    }
  },

  // 4. Cập nhật trạng thái yêu cầu duyệt Zalo (Admin)
  async updateZaloAccessStatus(id: string, status: 'approved' | 'rejected' | 'pending'): Promise<void> {
    if (providerType === 'supabase') {
      try {
        const { error } = await supabase
          .from('zalo_access')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
      } catch (e) {
        console.error('Lỗi khi cập nhật trạng thái Zalo trên Supabase:', e);
        throw e;
      }
    } else {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const list = JSON.parse(localStorage.getItem('txa_zalo_access') || '[]');
        const found = list.find((x: any) => x.id === id || x.token === id);
        if (found) {
          found.status = status;
          found.updatedAt = new Date().toISOString();
          localStorage.setItem('txa_zalo_access', JSON.stringify(list));
        }
      }
    }
  },

  // 5. Xóa yêu cầu duyệt Zalo (Admin)
  async deleteZaloAccessRequest(id: string): Promise<void> {
    if (providerType === 'supabase') {
      try {
        const { error } = await supabase
          .from('zalo_access')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (e) {
        console.error('Lỗi khi xóa yêu cầu Zalo trên Supabase:', e);
        throw e;
      }
    } else {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        let list = JSON.parse(localStorage.getItem('txa_zalo_access') || '[]');
        list = list.filter((x: any) => x.id !== id && x.token !== id);
        localStorage.setItem('txa_zalo_access', JSON.stringify(list));
      }
    }
  },

  // 6. Kiểm tra xem người dùng có được bypass duyệt Zalo không
  async checkZaloBypass(token: string | null, ip: string | null, username: string | null, email: string | null): Promise<boolean> {
    if (providerType === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('zalo_bypass')
          .select('*');

        if (error) throw error;
        if (!data || data.length === 0) return false;

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
    } else {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const list = JSON.parse(localStorage.getItem('txa_zalo_bypass') || '[]');
        return list.some((row: any) => {
          if (row.type === 'token' && token && row.value === token) return true;
          if (row.type === 'ip' && ip && row.value === ip) return true;
          if (row.type === 'user' && (
            (username && row.value.toLowerCase() === username.toLowerCase()) ||
            (email && row.value.toLowerCase() === email.toLowerCase())
          )) return true;
          return false;
        });
      }
      return false;
    }
  },

  // 7. Lấy danh sách Whitelist bypass Zalo
  async getZaloBypasses(): Promise<ZaloBypass[]> {
    if (providerType === 'supabase') {
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
    } else {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return JSON.parse(localStorage.getItem('txa_zalo_bypass') || '[]');
      }
      return [];
    }
  },

  // 8. Thêm mới Whitelist bypass Zalo
  async createZaloBypass(bypass: ZaloBypass): Promise<ZaloBypass> {
    if (providerType === 'supabase') {
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
    } else {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const list = JSON.parse(localStorage.getItem('txa_zalo_bypass') || '[]');
        const newItem = {
          id: 'bp_' + Math.floor(Math.random() * 100000000),
          type: bypass.type,
          value: bypass.value,
          description: bypass.description || null,
          createdAt: new Date().toISOString()
        };
        list.push(newItem);
        localStorage.setItem('txa_zalo_bypass', JSON.stringify(list));
        return newItem;
      }
      throw new Error('Chưa hỗ trợ local storage ở server-side');
    }
  },

  // 9. Xóa Whitelist bypass Zalo
  async deleteZaloBypass(id: string): Promise<void> {
    if (providerType === 'supabase') {
      try {
        const { error } = await supabase
          .from('zalo_bypass')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (e) {
        console.error('Lỗi khi xóa bypass trên Supabase:', e);
        throw e;
      }
    } else {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        let list = JSON.parse(localStorage.getItem('txa_zalo_bypass') || '[]');
        list = list.filter((x: any) => x.id !== id);
        localStorage.setItem('txa_zalo_bypass', JSON.stringify(list));
      }
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
    const durationMonths = data.durationMonths || 1;
    const maxDevices = data.maxDevices || 15;
    const expiryDate = new Date(Date.now() + durationMonths * 30 * 24 * 3600 * 1000).toISOString();
    const record = {
      id: 'key_' + Math.floor(Math.random() * 100000000),
      key_code: keyCode,
      package_title: data.packageTitle || 'Gói Key Bypass Zalo',
      recipient_email: data.email || null,
      note: data.note || null,
      duration_months: durationMonths,
      max_devices: maxDevices,
      expiry_date: expiryDate,
      status: 'active',
      created_at: new Date().toISOString()
    };

    if (providerType === 'supabase') {
      try {
        const { data: dbData, error } = await supabase
          .from('txa_zalo_bypass_keys')
          .insert({
            key_code: record.key_code,
            package_title: record.package_title,
            recipient_email: record.recipient_email,
            note: record.note,
            duration_months: record.duration_months,
            max_devices: record.max_devices,
            expiry_date: record.expiry_date,
            status: record.status
          })
          .select()
          .single();

        if (error) {
          console.error('Lỗi insert key bypass Supabase, fallback record local:', error);
        } else if (dbData) {
          return dbData;
        }
      } catch (err) {
        console.error('Supabase exception createBypassKey:', err);
      }
    }

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const list = JSON.parse(localStorage.getItem('txa_zalo_bypass_keys') || '[]');
      list.push(record);
      localStorage.setItem('txa_zalo_bypass_keys', JSON.stringify(list));
    }
    return record;
  },

  // 12. Lấy tất cả danh sách Key Bypass
  async getAllBypassKeys(): Promise<any[]> {
    if (providerType === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('txa_zalo_bypass_keys')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) return data;
      } catch (err) {
        console.error('Supabase getAllBypassKeys error:', err);
      }
    }
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return JSON.parse(localStorage.getItem('txa_zalo_bypass_keys') || '[]');
    }
    return [];
  },

  // 13. Lấy chi tiết Key và danh sách Browser Tokens sử dụng
  async getKeyDetailsWithLogs(keyCode: string): Promise<{ key: any; logs: any[] }> {
    let keyObj = null;
    let logsList: any[] = [];

    if (providerType === 'supabase') {
      try {
        const { data: kData } = await supabase
          .from('txa_zalo_bypass_keys')
          .select('*')
          .eq('key_code', keyCode)
          .maybeSingle();
        keyObj = kData;

        const { data: lData } = await supabase
          .from('txa_zalo_key_logs')
          .select('*')
          .eq('key_code', keyCode)
          .order('used_at', { ascending: false });
        if (lData) logsList = lData;
      } catch (err) {
        console.error('Supabase getKeyDetailsWithLogs error:', err);
      }
    }

    if (!keyObj && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const keys = JSON.parse(localStorage.getItem('txa_zalo_bypass_keys') || '[]');
      keyObj = keys.find((k: any) => k.key_code === keyCode);
      const allLogs = JSON.parse(localStorage.getItem('txa_zalo_key_logs') || '[]');
      logsList = allLogs.filter((l: any) => l.key_code === keyCode);
    }

    return { key: keyObj, logs: logsList };
  },

  // 14. Kiểm tra mã Key Bypass và gán tự động vào Browser Token
  async verifyAndApplyBypassKey(keyCode: string, browserToken: string, nickname: string, ip: string, userAgent: string): Promise<{ success: boolean; message: string; key?: any }> {
    const cleanKey = (keyCode || '').trim().toUpperCase();
    if (!cleanKey.startsWith('DP') || cleanKey.length !== 8) {
      return { success: false, message: 'Mã Key Bypass phải đúng 8 ký tự và bắt đầu bằng "DP"!' };
    }

    let keyRecord: any = null;
    let keyLogs: any[] = [];

    if (providerType === 'supabase') {
      try {
        const { data: kData } = await supabase
          .from('txa_zalo_bypass_keys')
          .select('*')
          .eq('key_code', cleanKey)
          .maybeSingle();
        keyRecord = kData;

        if (keyRecord) {
          const { data: lData } = await supabase
            .from('txa_zalo_key_logs')
            .select('*')
            .eq('key_code', cleanKey);
          if (lData) keyLogs = lData;
        }
      } catch (err) {
        console.error('Supabase verifyAndApplyBypassKey error:', err);
      }
    }

    if (!keyRecord && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const keys = JSON.parse(localStorage.getItem('txa_zalo_bypass_keys') || '[]');
      keyRecord = keys.find((k: any) => k.key_code === cleanKey);
      const allLogs = JSON.parse(localStorage.getItem('txa_zalo_key_logs') || '[]');
      keyLogs = allLogs.filter((l: any) => l.key_code === cleanKey);
    }

    if (!keyRecord) {
      return { success: false, message: 'Mã Key Bypass không tồn tại hoặc không hợp lệ!' };
    }

    if (keyRecord.status !== 'active') {
      return { success: false, message: `Mã Key này hiện đang ở trạng thái "${keyRecord.status}" và không thể sử dụng!` };
    }

    const expTime = new Date(keyRecord.expiry_date).getTime();
    if (Date.now() > expTime) {
      // Mark expired
      keyRecord.status = 'expired';
      return { success: false, message: 'Mã Key Bypass đã hết hạn sử dụng!' };
    }

    // Check unique devices / tokens
    const maxAllowed = keyRecord.max_devices || 15;
    const existingTokens = new Set((keyLogs || []).map((l: any) => l.browser_token));

    if (!existingTokens.has(browserToken) && existingTokens.size >= maxAllowed) {
      return { success: false, message: `Mã Key đã đạt giới hạn tối đa ${maxAllowed} thiết bị sử dụng. Vui lòng sử dụng hoặc mua mã Key mới!` };
    }

    // Log this browser token usage if new
    if (!existingTokens.has(browserToken)) {
      const newLog = {
        id: 'log_' + Math.floor(Math.random() * 100000000),
        key_code: cleanKey,
        browser_token: browserToken,
        nickname: nickname || 'Khách',
        ip: ip || null,
        user_agent: userAgent || null,
        used_at: new Date().toISOString()
      };

      if (providerType === 'supabase') {
        try {
          await supabase.from('txa_zalo_key_logs').insert({
            key_code: newLog.key_code,
            browser_token: newLog.browser_token,
            nickname: newLog.nickname,
            ip: newLog.ip,
            user_agent: newLog.user_agent
          });
        } catch (err) {
          console.error('Lỗi lưu key log Supabase:', err);
        }
      }

      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const allLogs = JSON.parse(localStorage.getItem('txa_zalo_key_logs') || '[]');
        allLogs.push(newLog);
        localStorage.setItem('txa_zalo_key_logs', JSON.stringify(allLogs));
      }
    }

    // Automatically approve zalo access for this token!
    await this.submitZaloAccessRequest({
      token: browserToken,
      nickname: nickname || 'Khách Bypass DP',
      status: 'approved',
      ip,
      userAgent
    });
    await this.updateZaloAccessStatus(browserToken, 'approved');

    return { success: true, message: 'Xác thực mã Key Bypass hợp lệ! Đã tự động phê duyệt truy cập.', key: keyRecord };
  },

  // 15. Khóa / thu hồi Key Bypass
  async revokeBypassKey(keyCode: string): Promise<void> {
    if (providerType === 'supabase') {
      try {
        await supabase
          .from('txa_zalo_bypass_keys')
          .update({ status: 'revoked' })
          .eq('key_code', keyCode);
      } catch (err) {
        console.error('Lỗi thu hồi key Supabase:', err);
      }
    }
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const keys = JSON.parse(localStorage.getItem('txa_zalo_bypass_keys') || '[]');
      const found = keys.find((k: any) => k.key_code === keyCode);
      if (found) {
        found.status = 'revoked';
        localStorage.setItem('txa_zalo_bypass_keys', JSON.stringify(keys));
      }
    }
  }
};

