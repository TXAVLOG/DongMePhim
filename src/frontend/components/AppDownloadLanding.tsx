import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Download, CheckCircle2, Info, QrCode, X, 
  ZoomIn, Play, Gauge, Ban, Tv, Shield 
} from 'lucide-react';

// Custom Brand Icons
const AndroidIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.6 14c-.52 0-.9-.45-.9-.9 0-.45.38-.9.9-.9.53 0 .9.45.9.9 0 .45-.38.9-.9.9M7.4 14c-.52 0-.9-.45-.9-.9 0-.45.38-.9.9-.9.53 0 .9.45.9.9 0 .45-.37.9-.9.9M18 10.3c.4 0 .7-.3.7-.7V6c0-.4-.3-.7-.7-.7s-.7.3-.7.7v3.6c0 .4.3.7.7.7M6 10.3c.4 0 .7-.3.7-.7V6c0-.4-.3-.7-.7-.7s-.7.3-.7.7v3.6c0 .4.3.7.7.7m13.7.6c-.6 0-1.1.5-1.1 1.1v4.8c0 .6.5 1.1 1.1 1.1.6 0 1.1-.5 1.1-1.1V12c0-.6-.5-1.1-1.1-1.1M4.3 10.9C3.7 10.9 3.2 11.4 3.2 12v4.8c0 .6.5 1.1 1.1 1.1.6 0 1.1-.5 1.1-1.1V12c0-.6-.5-1.1-1.1-1.1m7.7-6.2l1.6-2.8c.1-.2 0-.5-.2-.6-.2-.1-.5 0-.6.2l-1.7 3C10.5 4.1 9.8 4 9 4c-.8 0-1.5.1-2.2.4L5.1 1.4c-.1-.2-.4-.3-.6-.2-.2.1-.3.4-.2.6l1.6 2.8C4.1 6.1 3 8.3 3 10.9h14c0-2.6-1.1-4.8-2.9-6.2M17 12H3v6c0 1.1.9 2 2 2h2v2c0 .6.5 1 1 1s1-.4 1-1v-2h2v2c0 .6.5 1 1 1s1-.4 1-1v-2h2c1.1 0 2-.9 2-2v-6z" />
  </svg>
);

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
  </svg>
);

interface AppDownloadLandingProps {
  settings: any;
}

export default function AppDownloadLanding({ settings = {} }: AppDownloadLandingProps) {
  const [device, setDevice] = useState({ isAndroid: false, isIOS: false, isMobile: false });
  const [zoomQr, setZoomQr] = useState<'android' | 'ios' | 'smart_tv' | null>(null); // 'android' | 'ios' | 'smart_tv' | null
  const [activeTab, setActiveTab] = useState<'android' | 'ios_ota' | 'ios_ipa' | 'smart_tv'>('android'); // 'android' | 'ios_ota' | 'ios_ipa' | 'smart_tv'

  const isSettingEnabled = (val: any) => {
    if (val === undefined || val === null) return false;
    const s = String(val).trim().toLowerCase();
    return s === 'true' || s === '1' || s === '1.0' || val === true;
  };

  // Android parameters
  const androidEnabled = isSettingEnabled(settings.app_android_download_enable);
  const androidUrl = androidEnabled ? (settings.app_android_download_url || '').trim() : '';
  const apkSize = (settings.app_apk_size || '').trim();
  const apkSha = (settings.app_apk_sha256 || '').trim();

  // iOS parameters
  const iosDirectEnabled = isSettingEnabled(settings.app_ios_direct_install_enable);
  const iosDirectUrl = iosDirectEnabled ? (settings.app_ios_download_url || '').trim() : '';
  const iosIpaEnabled = isSettingEnabled(settings.app_ios_ipa_download_enable);
  const iosIpaUrl = iosIpaEnabled ? (settings.app_ios_ipa_url || '').trim() : '';

  // Play Store & App Store parameters
  const playStoreEnabled = isSettingEnabled(settings.app_google_play_enable);
  const playStoreUrl = playStoreEnabled ? (settings.app_google_play_url || '').trim() : '';
  const appStoreEnabled = isSettingEnabled(settings.app_app_store_enable);
  const appStoreUrl = appStoreEnabled ? (settings.app_app_store_url || '').trim() : '';

  // Smart TV parameters
  const smartTvEnabled = isSettingEnabled(settings.app_smart_tv_enable);
  const smartTvUrl = smartTvEnabled ? (settings.app_smart_tv_url || '').trim() : '';
  const smartTvSize = (settings.app_smart_tv_size || '').trim();
  const smartTvSha = (settings.app_smart_tv_sha256 || '').trim();

  const showAndroidTab = androidEnabled && androidUrl;
  const showIosOtaTab = iosDirectEnabled && iosDirectUrl;
  const showIosIpaTab = iosIpaEnabled && iosIpaUrl;
  const showSmartTvTab = false; // Disabled as Smart TVs auto-detect and redirect to /tv

  useEffect(() => {
    // Detect device
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isAndroid = /android/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isMobile = isAndroid || isIOS;
    setDevice({ isAndroid, isIOS, isMobile });

    if (isAndroid && showAndroidTab) {
      setActiveTab('android');
    } else if (isIOS && showIosOtaTab) {
      setActiveTab('ios_ota');
    } else if (isIOS && showIosIpaTab) {
      setActiveTab('ios_ipa');
    } else if (showAndroidTab) {
      setActiveTab('android');
    } else if (showIosOtaTab) {
      setActiveTab('ios_ota');
    } else if (showIosIpaTab) {
      setActiveTab('ios_ipa');
    } else if (showSmartTvTab) {
      setActiveTab('smart_tv');
    }
  }, []);

  const getPlayStoreBadge = () => "https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg";
  const getAppStoreBadge = () => "https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg";

  const formatSize = (bytes: any) => {
    if (!bytes) return 'N/A';
    const num = Number(bytes);
    if (isNaN(num)) return bytes;
    return (num / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Common parameters - ưu tiên lấy từ danh sách changelogs
  const changelogs = Array.isArray(settings.app_changelogs) && settings.app_changelogs.length > 0
    ? settings.app_changelogs
    : null;
  const appVersion = changelogs ? (changelogs[0]?.version || settings.app_version || '4.7.0') : (settings.app_version || '4.7.0');
  const releaseNotes = settings.app_release_notes || '🚀 Bản cập nhật mới hiệu năng vượt trội!';
  const releaseNotesLines = releaseNotes.split('\\n');

  const renderChangelog = () => (
    <div className="bg-gradient-to-br from-white/[0.015] to-white/[0.005] backdrop-blur-[20px] border border-white/[0.04] rounded-[24px] p-6 md:p-8 mt-12 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
      <h3 className="text-sm font-black text-white uppercase tracking-[0.08em] mb-6 flex items-center gap-3">
        <Info className="w-5 h-5 text-[#a78bfa]" /> Nhật ký phiên bản v{appVersion}
      </h3>
      {changelogs ? (
        <div className="space-y-6">
          {changelogs.map((log: any, idx: number) => (
            <div key={idx} className="text-left">
              <h4 className="text-[13px] font-black text-[#a78bfa] mb-2">
                v{log.version}{log.date ? ` — ${log.date}` : ''}{log.title ? ` · ${log.title}` : ''}
              </h4>
              <div className="space-y-1.5">
                {(log.content || '').split('\n').filter(Boolean).map((line: string, li: number) => (
                  <p key={li} className="text-[13.5px] text-zinc-400 leading-relaxed font-medium flex items-start gap-2">
                    <span className="text-[#a78bfa] mt-1.5 shrink-0">•</span>
                    <span>{line.replace(/^[-\s*•]+/,'')}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 text-left">
          {releaseNotesLines.map((line: string, idx: number) => (
            <p key={idx} className="text-[13.5px] text-zinc-400 leading-relaxed font-medium flex items-start gap-2">
              <span className="text-[#a78bfa] mt-1.5 shrink-0">•</span>
              <span>{line.replace(/^[-\s*•]+/,'')}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06070a] bg-[radial-gradient(circle_at_50%_0%,_#17122b_0%,_#06070a_100%)] pt-28 md:pt-36 pb-16 px-6 relative overflow-hidden flex flex-col font-sans text-white">
      {/* Matrix Digital Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(167,139,250,0.015)_1px,transparent_1px),_linear-gradient(90deg,rgba(167,139,250,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />

      {/* Cinematic Blur Spheres */}
      <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_70%)] blur-[60px] pointer-events-none z-0" />
      <div className="absolute bottom-[15%] right-[15%] w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.04)_0%,transparent_70%)] blur-[50px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto w-full relative z-10 flex-grow flex flex-col">
        
        {/* Header Hero Section */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/15 to-pink-500/5 border border-purple-500/25 mb-6 shadow-[0_5px_20px_rgba(124,58,237,0.15)]">
            <Smartphone className="w-4 h-4 text-[#a78bfa]" />
            <span className="text-[10px] font-black text-[#c084fc] uppercase tracking-wider">
              ỨNG DỤNG DI ĐỘNG CHÍNH THỨC v{appVersion}
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight uppercase bg-gradient-to-br from-white via-[#c084fc] to-[#db2777] bg-clip-text text-transparent drop-shadow-[0_10px_40px_rgba(124,58,237,0.15)]">
            Trải Nghiệm Điện Ảnh<br />Trên Tầm Tay
          </h2>
          <p className="text-zinc-400 mt-6 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed px-4">
            Xem phim trực tuyến chất lượng cực cao, tốc độ tải luồng Stream V6 siêu mượt qua Cloudflare CDN, hoàn toàn không quảng cáo và hỗ trợ chạy nền Picture-in-Picture.
          </p>
        </div>

        {/* Feature Showcase Grid */}
        <div className="mb-16">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest text-center mb-8">
            ⚡ ĐẶC TÍNH NỔI BẬT CỦA APP DI ĐỘNG
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Gauge className="w-8 h-8 text-[#a78bfa]" />, title: 'Stream V6 Ultra HD', desc: 'Bypass mọi giới hạn băng thông, tự động tải luồng phim siêu mượt 1080p/4K từ máy chủ Cloudflare.' },
              { icon: <Ban className="w-8 h-8 text-[#f43f5e]" />, title: '100% Không Quảng Cáo', desc: 'Lọc sạch toàn bộ các pop-up và banner độc hại, mang lại môi trường xem phim an toàn, tinh khiết.' },
              { icon: <Download className="w-8 h-8 text-[#10b981]" />, title: 'Tải Phim Offline', desc: 'Lưu trực tiếp tập phim vào bộ nhớ máy tốc độ cao, thưởng thức bất cứ lúc nào không cần kết nối mạng.' },
              { icon: <Tv className="w-8 h-8 text-[#06b6d4]" />, title: 'Phát Nền & PiP', desc: 'Thu nhỏ cửa sổ phát video xuống góc màn hình hoặc tiếp tục nghe nhạc phim ngay cả khi tắt màn hình.' }
            ].map((f, i) => (
              <div key={i} className="bg-gradient-to-br from-white/[0.02] to-white/[0.005] backdrop-blur-[20px] border border-white/[0.05] rounded-[24px] p-6 text-left flex flex-col h-full transition-all duration-300 hover:-translate-y-1.5 hover:border-[#a78bfa]/25 hover:shadow-[0_15px_35px_rgba(124,58,237,0.1)]">
                <div className="w-12 h-12 rounded-[16px] bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-5 shrink-0">
                  {f.icon}
                </div>
                <h4 className="font-black text-white text-base mb-2">{f.title}</h4>
                <p className="text-zinc-500 text-xs md:text-sm leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* main interactive download block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Action Cards (Left) */}
          <div className={`${device.isMobile ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
            {showAndroidTab && (!device.isMobile || device.isAndroid || (!device.isAndroid && !device.isIOS)) && (
              <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.005] backdrop-blur-[30px] border border-white/[0.05] rounded-[28px] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden text-left">
                {/* Glow Core */}
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(61,220,132,0.06)_0%,transparent_70%)] filter blur-[20px] pointer-events-none" />

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#3DDC84]/10 border border-[#3DDC84]/25 flex items-center justify-center shadow-[0_5px_20px_rgba(61,220,132,0.15)]">
                    <AndroidIcon className="w-7 h-7 text-[#3DDC84]" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base tracking-wide uppercase">ỨNG DỤNG CHO ANDROID</h3>
                    <p className="text-[10px] text-[#64748b] font-bold">Samsung, Xiaomi, Oppo, Vsmart, OnePlus...</p>
                  </div>
                </div>

                <div>
                  <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-6 font-medium">
                    Cài đặt trực tiếp file APK chất lượng cao mượt mà. Xem đầy đủ, tải offline và tương thích 100% các dòng Android.
                  </p>

                  {/* Specifications codeblock */}
                  {(apkSize || apkSha) && (
                    <div className="bg-black/40 border border-white/[0.03] rounded-2xl p-4 mb-6 font-mono text-[11px] text-zinc-400 space-y-1.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[#64748b]">File:</span> <span className="text-white font-bold">DongMePhim-Mobile.apk</span>
                        </div>
                        {apkSize && (
                          <div>
                            <span className="text-[#64748b]">Size:</span> <span className="text-[#3DDC84] font-bold">{formatSize(apkSize)}</span>
                          </div>
                        )}
                      </div>
                      {apkSha && (
                        <div className="break-all">
                          <span className="text-[#64748b]">SHA256:</span> <span className="text-[#a78bfa]">{apkSha}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4">
                    <a
                      href={androidUrl}
                      className="flex-1 py-4 bg-gradient-to-r from-[#3DDC84] to-[#10b981] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_8px_30px_rgba(61,220,132,0.25)] hover:from-[#4ef295] hover:to-[#14d192] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Tải Xuống Tệp APK
                    </a>
                    
                    {playStoreEnabled && playStoreUrl && (
                      <a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="flex-1 h-[52px] flex items-center justify-center bg-black border border-white/10 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all">
                        <img src={getPlayStoreBadge()} alt="Google Play Store" className="h-9 object-contain" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(showIosOtaTab || showIosIpaTab) && (!device.isMobile || device.isIOS || (!device.isAndroid && !device.isIOS)) && (
              <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.005] backdrop-blur-[30px] border border-white/[0.05] rounded-[28px] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden text-left">
                {/* Glow Core */}
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(167,139,250,0.06)_0%,transparent_70%)] filter blur-[20px] pointer-events-none" />

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_5px_20px_rgba(255,255,255,0.05)]">
                    <AppleIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base tracking-wide uppercase">ỨNG DỤNG CHO IOS (IPHONE/IPAD)</h3>
                    <p className="text-[10px] text-[#64748b] font-bold">iPhone, iPad chạy hệ điều hành iOS 14.0+...</p>
                  </div>
                </div>

                <div>
                  <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-6 font-medium">
                    Hỗ trợ cài trực tiếp thông qua trình duyệt Safari (OTA Doanh nghiệp) hoặc tải tệp tin IPA chưa ký để ký chép ngoài (Sideload) qua AltStore/Esign.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4">
                    {showIosOtaTab && (
                      <a
                        href={iosDirectUrl}
                        className="flex-1 py-4 bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_8px_30px_rgba(167,139,250,0.25)] hover:from-[#c084fc] hover:to-[#8b5cf6] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Cài Đặt Trực Tiếp (OTA)
                      </a>
                    )}
                    
                    {showIosIpaTab && (
                      <a
                        href={iosIpaUrl}
                        className="flex-1 py-3.5 border-2 border-[#a78bfa] text-[#a78bfa] font-black text-xs uppercase tracking-wider rounded-2xl hover:border-[#c084fc] hover:text-[#c084fc] hover:bg-[#a78bfa]/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Tải IPA Sideload
                      </a>
                    )}

                    {appStoreEnabled && appStoreUrl && (
                      <a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className="flex-1 h-[52px] flex items-center justify-center bg-black border border-white/10 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all">
                        <img src={getAppStoreBadge()} alt="App Store badge" className="h-9 object-contain" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showSmartTvTab && (
              <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.005] backdrop-blur-[30px] border border-white/[0.05] rounded-[28px] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden text-left">
                {/* Glow Core */}
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(245,158,11,0.06)_0%,transparent_70%)] filter blur-[20px] pointer-events-none" />

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shadow-[0_5px_20px_rgba(245,158,11,0.15)]">
                    <Tv className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base tracking-wide uppercase">ỨNG DỤNG CHO SMART TV / TV BOX</h3>
                    <p className="text-[10px] text-[#64748b] font-bold">Android TV, Sony, LG, Samsung, Xiaomi TV, TV Box...</p>
                  </div>
                </div>

                <div>
                  <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-6 font-medium">
                    Tải tệp APK cài đặt cho Smart TV chạy hệ điều hành Android TV / TV Box. Giao diện được tối ưu hóa cho màn hình TV lớn và hỗ trợ điều khiển bằng Remote.
                  </p>

                  {/* Specifications codeblock */}
                  {(smartTvSize || smartTvSha) && (
                    <div className="bg-black/40 border border-white/[0.03] rounded-2xl p-4 mb-6 font-mono text-[11px] text-zinc-400 space-y-1.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[#64748b]">File:</span> <span className="text-white font-bold">DongMePhim-TV.apk</span>
                        </div>
                        {smartTvSize && (
                          <div>
                            <span className="text-[#64748b]">Size:</span> <span className="text-amber-500 font-bold">{formatSize(smartTvSize)}</span>
                          </div>
                        )}
                      </div>
                      {smartTvSha && (
                        <div className="break-all">
                          <span className="text-[#64748b]">SHA256:</span> <span className="text-[#a78bfa]">{smartTvSha}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4">
                    <a
                      href={smartTvUrl}
                      className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.25)] hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Tải Xuống TV APK
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop QR Codes Column (Right) */}
          {!device.isMobile && (showAndroidTab || showIosOtaTab || showIosIpaTab || showSmartTvTab) && (
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.005] backdrop-blur-[30px] border border-white/[0.05] rounded-[28px] p-6 md:p-8 h-full flex flex-col justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative text-left">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.08em] mb-8 flex items-center gap-3">
                  <QrCode className="w-5 h-5 text-[#a78bfa]" /> Quét QR Code để cài đặt nhanh
                </h3>

                <div className="space-y-8">
                  {/* Android QR */}
                  {showAndroidTab && (
                    <div className="flex gap-4 items-center">
                      <div 
                        onClick={() => setZoomQr('android')}
                        className="bg-white p-2.5 rounded-[16px] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.4)] cursor-pointer transition-all duration-300 hover:scale-106 hover:shadow-[0_0_25px_rgba(61,220,132,0.4)] border-2 border-transparent hover:border-[#3DDC84] relative shrink-0"
                        title="Click để phóng to mã QR"
                      >
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(androidUrl)}`} alt="Android QR Code" className="w-[100px] h-[100px]" />
                        <div className="absolute bottom-1 right-1 bg-black/70 text-[#3DDC84] w-5.5 h-5.5 rounded-full flex items-center justify-center">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[#3DDC84] text-xs font-black mb-1">Android APK</h4>
                        <p className="text-[11px] text-[#64748b] font-semibold leading-relaxed">
                          Quét bằng Camera điện thoại hoặc Zalo để tải trực tiếp file cài đặt APK về máy.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* iOS QR */}
                  {(showIosOtaTab || showIosIpaTab) && (
                    <div className="flex gap-4 items-center">
                      <div 
                        onClick={() => setZoomQr('ios')}
                        className="bg-white p-2.5 rounded-[16px] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.4)] cursor-pointer transition-all duration-300 hover:scale-106 hover:shadow-[0_0_25px_rgba(167,139,250,0.4)] border-2 border-transparent hover:border-[#a78bfa] relative shrink-0"
                        title="Click để phóng to mã QR"
                      >
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/ios-access' : '')}`} alt="iOS QR Code" className="w-[100px] h-[100px]" />
                        <div className="absolute bottom-1 right-1 bg-black/70 text-[#a78bfa] w-5.5 h-5.5 rounded-full flex items-center justify-center">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[#a78bfa] text-xs font-black mb-1">iOS Direct & Sideload</h4>
                        <p className="text-[11px] text-[#64748b] font-semibold leading-relaxed">
                          Quét bằng Camera để đăng ký UDID thiết bị chép trực tiếp hoặc tải tệp cấu hình.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Smart TV QR */}
                  {showSmartTvTab && (
                    <div className="flex gap-4 items-center">
                      <div 
                        onClick={() => setZoomQr('smart_tv')}
                        className="bg-white p-2.5 rounded-[16px] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.4)] cursor-pointer transition-all duration-300 hover:scale-106 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] border-2 border-transparent hover:border-amber-500 relative shrink-0"
                        title="Click để phóng to mã QR"
                      >
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(smartTvUrl)}`} alt="Smart TV QR Code" className="w-[100px] h-[100px]" />
                        <div className="absolute bottom-1 right-1 bg-black/70 text-amber-500 w-5.5 h-5.5 rounded-full flex items-center justify-center">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-amber-500 text-xs font-black mb-1">Smart TV APK</h4>
                        <p className="text-[11px] text-[#64748b] font-semibold leading-relaxed">
                          Quét để tải trực tiếp file cài đặt APK về Smart TV hoặc TV Box.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive detailed Installation Guide (Center tab section) */}
        {(showAndroidTab || showIosOtaTab || showIosIpaTab || showSmartTvTab) ? (
          <div className="mt-8 text-center">
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6">
              🛠️ HƯỚNG DẪN CÀI ĐẶT CHI TIẾT TỪNG BƯỚC
            </p>

            {/* Capsule Tab Buttons */}
            <div className="flex justify-center mb-8 p-1.5 rounded-full bg-black/25 border border-white/[0.04] max-w-[640px] mx-auto">
              {[
                { id: 'android', label: 'Android APK', icon: <AndroidIcon className="w-4 h-4" />, platform: 'android', show: showAndroidTab },
                { id: 'ios_ota', label: 'iOS Direct', icon: <AppleIcon className="w-4 h-4" />, platform: 'ios', show: showIosOtaTab },
                { id: 'ios_ipa', label: 'iOS IPA (Sideload)', icon: <AppleIcon className="w-4 h-4" />, platform: 'ios', show: showIosIpaTab },
                { id: 'smart_tv', label: 'Smart TV APK', icon: <Tv className="w-4 h-4" />, platform: 'tv', show: showSmartTvTab }
              ].filter(tab => {
                if (!tab.show) return false;
                if (!device.isMobile) return true;
                if (device.isAndroid) return tab.platform === 'android' || tab.platform === 'tv';
                if (device.isIOS) return tab.platform === 'ios';
                return true;
              }).map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 px-3 sm:px-6 rounded-full flex items-center justify-center gap-1.5 font-black text-[11px] sm:text-xs tracking-wider transition-all duration-300 border-none cursor-pointer ${active ? 'bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-black shadow-[0_5px_20px_rgba(124,58,237,0.3)]' : 'bg-transparent text-zinc-500 hover:text-white'}`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Installation steps panel based on tab */}
            <div className="bg-gradient-to-br from-white/[0.015] to-white/[0.005] backdrop-blur-[20px] border border-white/[0.05] rounded-[28px] p-6 md:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.25)] text-left">
              {activeTab === 'android' && showAndroidTab && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <AndroidIcon className="w-5 h-5 text-[#3DDC84]" /> Cài đặt ứng dụng Android APK
                      </h3>
                      <div className="space-y-6">
                        {[
                          { step: '01', title: 'Tải tệp cài đặt APK', desc: 'Nhấp chọn nút "Tải Xuống Tệp APK" ở trên. Trình duyệt sẽ tự động lưu tệp tin `DongMePhim-Mobile.apk` về thư mục Tải xuống.' },
                          { step: '02', title: 'Cài đặt ứng dụng', desc: 'Sau khi tải xong, mở tệp cài đặt. Nếu có thông báo hệ thống bảo mật, chọn Cài đặt -> Cho phép từ nguồn không xác định.' },
                          { step: '03', title: 'Xác nhận vượt Play Protect', desc: 'Bấm Cài đặt. Nếu Play Protect hiển thị cảnh báo chặn ứng dụng, nhấn chọn nút "Vẫn cài đặt" (Install Anyway) để tiếp tục.' },
                          { step: '04', title: 'Mở ứng dụng', desc: 'Quá trình hoàn tất sau 5 giây. Biểu tượng ứng dụng sẽ xuất hiện ở màn hình chính, mở ứng dụng, đăng nhập tài khoản và trải nghiệm!' }
                        ].map((step, idx) => (
                          <div className="flex gap-4" key={idx}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3DDC84] to-[#10b981] text-black text-[12px] font-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(61,220,132,0.3)]">
                              {step.step}
                            </div>
                            <div>
                              <h4 className="font-black text-white text-[14px] mb-1">{step.title}</h4>
                              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="bg-red-500/5 border border-red-500/15 rounded-[20px] p-6">
                        <h4 className="text-red-400 font-black flex items-center gap-2 text-[14px] mb-3 uppercase tracking-wider">
                          <Shield className="w-5 h-5" /> LƯU Ý BẢO MẬT HỆ THỐNG
                        </h4>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium mb-3">
                          Do tệp APK của chúng tôi tích hợp thư viện giải mã video Stream V6 độc quyền chống chặn link nên một số bộ lọc bảo mật tự động (như Google Play Protect) có thể đưa ra cảnh báo "Tệp không an toàn".
                        </p>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">
                          Chúng tôi cam kết 100% tệp ứng dụng hoàn toàn sạch, không mã độc, không đánh cắp thông tin người dùng. Bạn hoàn toàn yên tâm bấm **"Vẫn cài đặt"** để trải nghiệm bình thường.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ios_ota' && showIosOtaTab && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <AppleIcon className="w-5 h-5 text-[#c084fc]" /> Cài đặt iOS trực tiếp (OTA Safari)
                      </h3>
                      <div className="space-y-6">
                        {[
                          { step: '01', title: 'Truy cập bằng Safari', desc: 'Bắt buộc mở Safari mặc định trên iPhone/iPad của bạn để truy cập trang web này.' },
                          { step: '02', title: 'Nhấn Cài đặt trực tiếp', desc: 'Chọn nút "Cài Đặt Trực Tiếp (OTA)" ở trên. Một pop-up hệ thống xuất hiện, chọn cài đặt cấu hình.' },
                          { step: '03', title: 'Đăng ký chứng chỉ thiết bị', desc: 'Chờ ứng dụng tải trên màn hình. Sau khi cài xong, ứng dụng sẽ hiện lỗi "Nhà phát triển doanh nghiệp chưa được tin cậy" khi mở.' },
                          { step: '04', title: 'Kích hoạt Tin cậy ứng dụng', desc: 'Vào Cài đặt hệ thống -> Cài đặt chung -> Quản lý VPN & Thiết bị. Click vào chứng chỉ Doanh nghiệp tương ứng và chọn "Tin cậy" (Trust).' }
                        ].map((step, idx) => (
                          <div className="flex gap-4" key={idx}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] text-white text-[12px] font-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(167,139,250,0.3)]">
                              {step.step}
                            </div>
                            <div>
                              <h4 className="font-black text-white text-[14px] mb-1">{step.title}</h4>
                              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="bg-[#a78bfa]/5 border border-[#a78bfa]/15 rounded-[20px] p-6">
                        <h4 className="text-[#c084fc] font-black flex items-center gap-2 text-[14px] mb-3 uppercase tracking-wider">
                          <Info className="w-5 h-5" /> ĐĂNG KÝ THIẾT BỊ UDID DOANH NGHIỆP
                        </h4>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium mb-3">
                          Bản cài đặt trực tiếp OTA sử dụng chứng chỉ Doanh nghiệp (Enterprise Provisioning) có thể bị thu hồi ngẫu nhiên bởi Apple.
                        </p>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">
                          Nếu bạn quét mã không tải được hoặc ứng dụng báo bảo trì chứng chỉ, vui lòng sử dụng phương pháp **Tải IPA Sideload** chép ngoài bên tab hướng dẫn bên cạnh để hoạt động vĩnh viễn không bao giờ bị thu hồi.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ios_ipa' && showIosIpaTab && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <AppleIcon className="w-5 h-5 text-[#db2777]" /> Cài đặt iOS IPA (Sideload thủ công)
                      </h3>
                      <div className="space-y-6">
                        {[
                          { step: '01', title: 'Tải tệp cài đặt IPA', desc: 'Chọn nút "Tải IPA Sideload" phía trên để lưu trữ tệp tin `DongMePhim-Premium.ipa` gốc chưa ký vào bộ nhớ thiết bị.' },
                          { step: '02', title: 'Tải công cụ Sideload', desc: 'Tải một trong các ứng dụng nạp chép chứng chỉ thông dụng trên máy tính hoặc điện thoại: Esign, AltStore, Sideloadly hoặc Scarlet.' },
                          { step: '03', title: 'Ký chứng chỉ cá nhân', desc: 'Nạp tệp IPA vào ứng dụng sideload. Điền tài khoản Apple ID cá nhân của bạn (qua cơ chế AltStore/Sideloadly) để tiến hành ký số tự động.' },
                          { step: '04', title: 'Nạp ứng dụng & Tin cậy', desc: 'Nhấn cài đặt chép app vào iPhone. Vào Cài đặt -> Cài đặt chung -> Quản lý VPN & Thiết bị, chọn nhà phát triển tương ứng nhấn "Tin cậy".' }
                        ].map((step, idx) => (
                          <div className="flex gap-4" key={idx}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#db2777] to-[#ec4899] text-white text-[12px] font-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                              {step.step}
                            </div>
                            <div>
                              <h4 className="font-black text-white text-[14px] mb-1">{step.title}</h4>
                              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="bg-[#db2777]/5 border border-[#db2777]/15 rounded-[20px] p-6">
                        <h4 className="text-[#f472b6] font-black flex items-center gap-2 text-[14px] mb-3 uppercase tracking-wider">
                          <Shield className="w-5 h-5" /> LỢI THẾ CỦA SIDELOAD IPA
                        </h4>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium mb-3">
                          Phương pháp Sideload chép chứng chỉ thủ công IPA bằng Apple ID cá nhân đem lại độ ổn định tuyệt đối 100%.
                        </p>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">
                          Ứng dụng của bạn sẽ hoạt động trơn tru vĩnh viễn và không bao giờ lo bị Apple thu hồi chứng chỉ đột ngột như phương thức cài Doanh nghiệp (OTA Safari).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'smart_tv' && showSmartTvTab && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Tv className="w-5 h-5 text-amber-500" /> Cài đặt ứng dụng trên Smart TV / TV Box
                      </h3>
                      <div className="space-y-6">
                        {[
                          { step: '01', title: 'Tải tệp TV APK', desc: 'Nhấp chọn nút "Tải Xuống TV APK" ở trên và sao chép tệp tin `DongMePhim-TV.apk` vào thẻ nhớ USB.' },
                          { step: '02', title: 'Cắm USB vào TV', desc: 'Cắm thẻ nhớ USB chứa tệp cài đặt vào cổng kết nối USB của Smart TV hoặc Android TV Box của bạn.' },
                          { step: '03', title: 'Duyệt và cài đặt file', desc: 'Sử dụng ứng dụng Quản lý tệp (File Manager) trên TV để tìm đến USB và nhấn cài đặt tệp APK.' },
                          { step: '04', title: 'Cho phép nguồn không xác định', desc: 'Nếu có thông báo bảo mật chặn, đi đến Cài đặt của TV -> Bảo mật & Hạn chế -> Cho phép cài đặt ứng dụng từ nguồn không xác định cho trình quản lý tệp.' }
                        ].map((step, idx) => (
                          <div className="flex gap-4" key={idx}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-black text-[12px] font-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                              {step.step}
                            </div>
                            <div>
                              <h4 className="font-black text-white text-[14px] mb-1">{step.title}</h4>
                              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="bg-amber-500/5 border border-amber-500/15 rounded-[20px] p-6">
                        <h4 className="text-amber-500 font-black flex items-center gap-2 text-[14px] mb-3 uppercase tracking-wider">
                          <Info className="w-5 h-5" /> TỐI ƯU HÓA CHO MÀN HÌNH LỚN
                        </h4>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium mb-3">
                          Phiên bản TV APK được tinh chỉnh đặc biệt với giao diện ngang 16:9 sắc nét, dễ dàng điều hướng bằng Remote điều khiển cầm tay mà không cần chuột bay.
                        </p>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">
                          Hỗ trợ đầy đủ các tính năng stream chất lượng cao nhất, lưu lịch sử xem đồng bộ với tài khoản trên web/di động.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-white/[0.015] to-white/[0.005] backdrop-blur-[20px] border border-white/[0.05] rounded-[28px] p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.25)] mt-8">
            <Ban className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Ứng dụng đang bảo trì</h3>
            <p className="text-zinc-400 text-sm mt-2 max-w-md mx-auto">
              Hiện tại các cổng tải ứng dụng di động đang được nâng cấp bảo trì. Quý khách vui lòng truy cập lại sau!
            </p>
          </div>
        )}

        {renderChangelog()}
      </div>

      {/* GLOWING GLASSMORPHIC QR CODE ZOOM MODAL */}
      {zoomQr && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300">
          <div className="relative bg-gradient-to-br from-white/[0.02] to-white/[0.005] backdrop-blur-[30px] border border-white/[0.08] p-6 md:p-10 rounded-[32px] shadow-[0_25px_80px_rgba(0,0,0,0.8)] outline-none flex flex-col items-center gap-6 max-w-sm w-full">
            <button 
              onClick={() => setZoomQr(null)}
              className="absolute top-4 right-4 text-white/40 bg-white/[0.02] border border-white/[0.05] hover:text-white hover:bg-white/[0.08] hover:border-white/15 p-2 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              QUÉT MÃ QR ĐỂ CÀI ĐẶT
            </h3>

            <div className="bg-white p-4 rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center border-2 border-[#a78bfa]/30">
              <img 
                src={zoomQr === 'android' 
                  ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(androidUrl)}` 
                  : zoomQr === 'smart_tv'
                  ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(smartTvUrl)}`
                  : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/ios-access' : '')}`
                } 
                alt="Zoomed QR" 
                className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px]" 
              />
            </div>
            
            <p className="text-[11px] text-zinc-500 font-semibold text-center leading-relaxed">
              Dùng ứng dụng Quét mã hoặc Máy ảnh trên thiết bị {zoomQr === 'android' ? 'Android' : zoomQr === 'smart_tv' ? 'Smart TV' : 'iOS'} để nhận dạng link.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
