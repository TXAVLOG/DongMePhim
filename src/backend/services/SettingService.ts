import { LocalSettingProvider } from './providers/LocalSettingProvider';
import { SupabaseSettingProvider } from './providers/SupabaseSettingProvider';
import type { ISettingProvider, SiteSettings } from '@apptypes/settings';

// Chọn provider dựa trên biến môi trường (mặc định 'local')
const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'supabase';

let settingProvider: ISettingProvider;

if (providerType === 'supabase') {
  settingProvider = new SupabaseSettingProvider();
} else {
  settingProvider = new LocalSettingProvider();
}

let cachedSettings: SiteSettings | null = null;
let cacheExpires = 0;
const CACHE_TTL = 10 * 1000; // 10 seconds to prevent stale data across Cloudflare edge nodes

export const SettingService = {
  getSettings: async (): Promise<SiteSettings> => {
    if (cachedSettings && Date.now() < cacheExpires) {
      return cachedSettings;
    }
    const settings = await settingProvider.getSettings();
    cachedSettings = settings;
    cacheExpires = Date.now() + CACHE_TTL;
    return settings;
  },
  updateSettings: async (settings: SiteSettings): Promise<void> => {
    await settingProvider.updateSettings(settings);
    // Invalidate cache immediately
    cachedSettings = null;
    cacheExpires = 0;
  },
  clearCache: () => {
    cachedSettings = null;
    cacheExpires = 0;
  }
};
