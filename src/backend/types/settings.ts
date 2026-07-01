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
  tmdb_api_key?: string;
  site_title_template?: string;
  meta_robots?: string;
  og_image_default?: string;
  google_verification?: string;
  bing_verification?: string;
  schema_logo_url?: string;
  schema_business_name?: string;
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
  social_discord_enable?: boolean;
  social_discord_url?: string;
  decoy_enable: boolean;
  decoy_passcode: string;
  zalo_lock_enable: boolean;
}

export interface LuckyDrawSettings {
  lucky_draw_active_event_id: string;
}

export interface PaymentSettings {
  sepay_sandbox_api_key: string;
  sandbox_mode: boolean;
  sepay_sandbox_mode?: boolean;
  payos_enable: boolean;
  payos_client_id: string;
  payos_api_key: string;
  payos_checksum_key: string;
  paypal_enable: boolean;
  paypal_client_id: string;
  sepay_enable: boolean;
  sepay_api_key: string;
  sepay_merchant_id?: string;
  sepay_secret_key?: string;
  sepay_ipn_secret_key?: string;
  sepay_sandbox_merchant_id?: string;
  sepay_sandbox_secret_key?: string;
  sepay_integration_type?: 'vietqr' | 'gateway';
  sepay_bank_account_id?: string;
  sepay_bank_name?: string;
  sepay_account_no?: string;
  sepay_account_name?: string;
  vnpay_enable: boolean;
  vnpay_tmn_code: string;
  vnpay_hash_secret: string;
  stripe_enable: boolean;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  vat_rate?: number;
  manual_enable: boolean;
  manual_bank_name: string;
  manual_account_no: string;
  manual_account_name: string;
}
export interface PlanPermission {
  max_resolution: 'SD' | 'HD' | 'FHD' | '4K';
  allowed_servers: string[];
  max_playlists: number;
  watch_together: boolean;
  hide_watermark: boolean;
  vip_badge: boolean;
  bypass_ads: boolean;
  ads_only_in_player?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  title: string;
  price: number;
  annual_price?: number;
  cycle?: 'lifetime' | 'monthly' | 'annual' | 'free';
  style_type: 'default' | 'custom_color' | 'rainbow_effect';
  custom_color?: string;
  features: string[];
  permissions: PlanPermission;
  enabled?: boolean;
  sale_price?: number | null;
  sale_months?: number | null;
  sale_end_date?: string | null;
}

export interface AdSettings {
  pre_roll_enable: boolean;
  pre_roll_type: 'video' | 'embed';
  pre_roll_url: string;
  pre_roll_skip_seconds: number;
  click_ad_enable: boolean;
  click_ad_code: string;
  click_ad_threshold: number;
  google_ads_enable?: boolean;
  google_ads_client_id?: string;
  offerwall_enable?: boolean;
  offerwall_script?: string;
  ad_provider?: 'none' | 'google_ads' | 'offerwall' | 'both';
}

export interface SiteSettings {
  general: GeneralSettings;
  smtp: SMTPSettings;
  telegram: TelegramSettings;
  app: AppSettings;
  user: UserSettings;
  login: LoginSettings;
  social: SocialSettings;
  luckyDraw: LuckyDrawSettings;
  payments: PaymentSettings;
  packages: SubscriptionPlan[];
  ads: AdSettings;
}

export interface ISettingProvider {
  getSettings(): Promise<SiteSettings>;
  updateSettings(settings: SiteSettings): Promise<void>;
}
