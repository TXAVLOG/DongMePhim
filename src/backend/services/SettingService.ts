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
    
    // Sanitize payments configuration dynamically
    if (settings && settings.payments) {
      const payments = settings.payments as any;
      const isSepayEnabled = !!payments.sepay_enable;
      
      const isSandbox = payments.sepay_sandbox_mode !== undefined
        ? !!payments.sepay_sandbox_mode
        : !!payments.sandbox_mode;

      const apiKey = isSandbox 
        ? payments.sepay_sandbox_api_key 
        : payments.sepay_api_key;

      let isConfigured = false;
      if (isSepayEnabled && apiKey && apiKey.trim().length > 0) {
        if (payments.sepay_integration_type === 'gateway') {
          isConfigured = !!payments.sepay_bank_account_id && payments.sepay_bank_account_id.trim().length > 0;
        } else {
          isConfigured = !!payments.sepay_account_no && payments.sepay_account_no.trim().length > 0 &&
                         !!payments.sepay_bank_name && payments.sepay_bank_name.trim().length > 0;
        }
      }

      if (!isConfigured) {
        payments.sepay_enable = false;
      }
    }

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
