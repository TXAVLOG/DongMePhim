import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async () => {
  const settings = await SettingService.getSettings();
  const ads = settings.ads || {};

  const isSettingEnabled = (val: any) => {
    if (val === undefined || val === null) return false;
    const s = String(val).trim().toLowerCase();
    return s === 'true' || s === '1' || s === '1.0';
  };

  const admobEnable = ads.admob_enable !== undefined ? isSettingEnabled(ads.admob_enable) : true;
  const adFreeEnable = ads.admob_ad_free_enable !== undefined ? isSettingEnabled(ads.admob_ad_free_enable) : true;
  const requiredAds = Number(ads.admob_ad_free_required_ads) || 2;
  const durationHours = Number(ads.admob_ad_free_duration_hours) || 24;
  const maxStackHours = Number(ads.admob_ad_free_max_stack_hours) || 48;

  const androidAds = {
    app_start_id: ads.admob_app_start_ad_id_android || ads.admob_app_start_ad_id || '',
    preroll_id: ads.admob_preroll_ad_id_android || ads.admob_preroll_ad_id || '',
    banner_id: ads.admob_banner_ad_id_android || '',
    rewarded_icon_id: ads.admob_rewarded_ad_id_android || ads.admob_rewarded_ad_id || '',
    rewarded_ad_free_id: ads.admob_rewarded_ad_free_id_android || ads.admob_rewarded_ad_id_android || ads.admob_rewarded_ad_id || '',
  };

  const iosAds = {
    app_start_id: ads.admob_app_start_ad_id_ios || ads.admob_app_start_ad_id || '',
    preroll_id: ads.admob_preroll_ad_id_ios || ads.admob_preroll_ad_id || '',
    banner_id: ads.admob_banner_ad_id_ios || '',
    rewarded_icon_id: ads.admob_rewarded_ad_id_ios || ads.admob_rewarded_ad_id || '',
    rewarded_ad_free_id: ads.admob_rewarded_ad_free_id_ios || ads.admob_rewarded_ad_id_ios || ads.admob_rewarded_ad_id || '',
  };

  return apiResponse({
    admob_enable: admobEnable,
    ad_free_pass: {
      enabled: adFreeEnable,
      required_ads: requiredAds,
      duration_hours: durationHours,
      max_stack_hours: maxStackHours,
    },
    android: androidAds,
    ios: iosAds,
  });
};
