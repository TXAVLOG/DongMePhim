import { LocalSettingProvider } from './providers/LocalSettingProvider';
import { SupabaseSettingProvider } from './providers/SupabaseSettingProvider';
import type { ISettingProvider, SiteSettings } from '../types/settings';

// Chọn provider dựa trên biến môi trường (mặc định 'local')
const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'local';

let settingProvider: ISettingProvider;

if (providerType === 'supabase') {
  settingProvider = new SupabaseSettingProvider();
} else {
  settingProvider = new LocalSettingProvider();
}

export const SettingService = {
  getSettings: () => settingProvider.getSettings(),
  updateSettings: (settings: SiteSettings) => settingProvider.updateSettings(settings)
};
