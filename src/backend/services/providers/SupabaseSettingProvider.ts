import { supabase } from '@lib/supabase';
import type { ISettingProvider, SiteSettings } from '@apptypes/settings';
import { seedSettings } from './LocalSettingProvider';

export class SupabaseSettingProvider implements ISettingProvider {
  async getSettings(): Promise<SiteSettings> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      if (error) {
        throw error;
      }

      // Khởi tạo settings với bản sao sâu của seedSettings
      const settings: SiteSettings = JSON.parse(JSON.stringify(seedSettings));

      if (data && data.length > 0) {
        data.forEach((row: any) => {
          if (row.key in settings) {
            if (Array.isArray(row.value)) {
              (settings as any)[row.key] = row.value;
            } else {
              (settings as any)[row.key] = {
                ...(settings as any)[row.key],
                ...row.value
              };
            }
          }
        });
      }

      return settings;
    } catch (e) {
      console.error('Lỗi khi tải cấu hình từ Supabase:', e);
      return seedSettings;
    }
  }

  async updateSettings(settings: SiteSettings): Promise<void> {
    try {
      const keys = Object.keys(settings) as Array<keyof SiteSettings>;
      const upsertData = keys.map(key => ({
        key,
        value: settings[key],
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('settings')
        .upsert(upsertData, { onConflict: 'key' });

      if (error) {
        throw error;
      }
    } catch (e) {
      console.error('Lỗi khi cập nhật cấu hình lên Supabase:', e);
      throw e;
    }
  }
}
