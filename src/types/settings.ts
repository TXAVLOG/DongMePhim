// SocialLink interface is removed as it's computed now.

export interface GeneralSettings {
  site_name: string;
  site_url: string;
  site_description: string;
  site_keywords: string;
  maintenance_enable: boolean;
  maintenance_message?: string;
  maintenance_end_time?: string;
  api_encrypt_enable: boolean;
  api_encrypt_pass?: string;
  decoy_enable?: boolean;
  zalo_lock_enable?: boolean;
  decoy_passcode?: string;
}

export interface SMTPSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: "SSL" | "TLS" | "NONE";
  smtp_user: string;
  smtp_pass: string;
  smtp_from_email: string;
  smtp_from_name: string;
}

export interface TelegramSettings {
  telegram_bot_token: string;
  telegram_chat_id: string;
  telegram_channel_id: string;
  telegram_bot_username: string;
  telegram_verified: boolean;
  telegram_notify_report: boolean;
  telegram_notify_zalo: boolean;
  telegram_notify_user: boolean;
  telegram_notify_luckydraw: boolean;
}

export interface AppSettings {
  app_version: string;
  app_release_notes: string;
  app_changelogs: { version: string; date: string; title: string; content: string }[];
  app_android_download_enable: boolean;
  app_android_download_url: string;
  app_apk_size: string;
  app_apk_sha256: string;
  app_ios_direct_install_enable: boolean;
  app_ios_download_url: string;
  app_ios_ipa_download_enable: boolean;
  app_ios_ipa_url: string;
  app_google_play_enable: boolean;
  app_google_play_url: string;
  app_app_store_enable: boolean;
  app_app_store_url: string;
}

export interface UserSettings {
  allow_registration: boolean;
  require_email_verification: boolean;
  verification_method?: 'link' | 'otp';
  verification_token_expiry: number;
  reset_password_token_expiry: number;
}

export interface LoginSettings {
  login_standard_enable: boolean;
  login_google_enable: boolean;
  login_google_client_id: string;
  login_google_client_secret: string;
  login_google_onetap_enable: boolean;
  login_fb_enable: boolean;
  login_fb_app_id: string;
  login_fb_app_secret: string;
  login_apple_enable: boolean;
  login_apple_client_id: string;
  login_apple_team_id: string;
  login_apple_key_id: string;
  login_zalo_enable: boolean;
  login_zalo_app_id: string;
  login_zalo_secret_key: string;
  login_discord_enable: boolean;
  login_discord_client_id: string;
  login_discord_client_secret: string;
  login_github_enable: boolean;
  login_github_client_id: string;
  login_github_client_secret: string;
  login_x_enable: boolean;
  login_x_client_id: string;
  login_x_client_secret: string;
  turnstile_enable?: boolean;
  turnstile_site_key?: string;
  turnstile_secret_key?: string;
}

export interface SocialSettings {
  social_fb_enable: boolean;
  social_fb_url: string;
  social_fb_group_enable: boolean;
  social_fb_group_url: string;
  social_telegram_enable: boolean;
  social_telegram_url: string;
  social_tiktok_enable: boolean;
  social_tiktok_url: string;
  social_zalo_group_enable: boolean;
  social_zalo_group_url: string;
  decoy_enable: boolean;
  decoy_passcode: string;
  zalo_lock_enable: boolean;
}

export interface LuckyDrawSettings {
  lucky_draw_active_event_id: string;
}

export interface PaymentSettings {
  sandbox_mode: boolean;
  payos_enable: boolean;
  payos_client_id: string;
  payos_api_key: string;
  payos_checksum_key: string;
  paypal_enable: boolean;
  paypal_client_id: string;
  sepay_enable: boolean;
  sepay_api_key: string;
  vnpay_enable: boolean;
  vnpay_tmn_code: string;
  vnpay_hash_secret: string;
  stripe_enable: boolean;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  manual_enable: boolean;
  manual_bank_name: string;
  manual_account_no: string;
  manual_account_name: string;
}

export interface SiteSettings {
  // Categorized settings from DATABASE.md
  general: GeneralSettings;
  smtp: SMTPSettings;
  telegram: TelegramSettings;
  app: AppSettings;
  user: UserSettings;
  login: LoginSettings;
  social: SocialSettings;
  luckyDraw: LuckyDrawSettings;
  payments: PaymentSettings;
}

export interface ISettingProvider {
  getSettings(): Promise<SiteSettings>;
  updateSettings(settings: SiteSettings): Promise<void>;
}
