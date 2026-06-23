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
  }
};
