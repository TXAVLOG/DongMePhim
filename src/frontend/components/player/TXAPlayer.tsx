import React, { useEffect, useRef, useState } from 'react';

interface Subtitle {
  label: string;
  file: string;
  default?: boolean;
}

interface Quality {
  html: string;
  url: string;
  default?: boolean;
}

interface TXAPlayerProps {
  url: string;
  title: string;
  poster?: string;
  subtitles?: Subtitle[];
  qualities?: Quality[];
  onChangeQuality?: (quality: Quality) => void;
  siteName?: string;
  siteUrl?: string;
  storyboardUrl?: string;
  timeIntroStart?: number;
  timeIntroEnd?: number;
  timeOutroStart?: number;
  timeOutroEnd?: number;
}

declare global {
  interface Window {
    jwplayer?: any;
  }
}

export const TXAPlayer: React.FC<TXAPlayerProps> = ({
  url,
  title,
  poster,
  subtitles = [],
  qualities = [],
  onChangeQuality,
  siteName = 'WebFilm',
  siteUrl = '#',
  storyboardUrl,
  timeIntroStart = 0,
  timeIntroEnd = 0,
  timeOutroStart = 0,
  timeOutroEnd = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);
  
  // Trạng thái theo dõi tiến trình để phục vụ tính năng auto skip và skip overlays
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSkipIntroBtn, setShowSkipIntroBtn] = useState(false);
  const [showSkipOutroBtn, setShowSkipOutroBtn] = useState(false);
  
  const hasAutoSkippedIntro = useRef(false);
  const hasAutoSkippedOutro = useRef(false);

  // Trạng thái bật/tắt Tự động Skip (lưu vào localStorage)
  const [isAutoSkipEnabled, setIsAutoSkipEnabled] = useState(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('tsettings');
        const parsed = stored ? JSON.parse(stored) : {};
        return parsed.autoSkip ?? true;
      } catch (e) {
        return true;
      }
    }
    return true;
  });

  // Trạng thái Toast thông báo
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2000);
  };

  const toggleAutoSkip = () => {
    const nextVal = !isAutoSkipEnabled;
    setIsAutoSkipEnabled(nextVal);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('tsettings');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.autoSkip = nextVal;
        localStorage.setItem('tsettings', JSON.stringify(parsed));
      } catch (e) {}
    }
    showToast(`Tự động Skip: ${nextVal ? 'Bật' : 'Tắt'} ⏭️`);
  };

  // Theo dõi trạng thái offline/online
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (isOffline) return;

    let active = true;
    let script = document.querySelector('script[src="/js/jwplayer.js"]') as HTMLScriptElement;

    // Reset cờ bỏ qua khi đổi link/tập mới
    hasAutoSkippedIntro.current = false;
    hasAutoSkippedOutro.current = false;
    setShowSkipIntroBtn(false);
    setShowSkipOutroBtn(false);

    const initPlayer = () => {
      if (!containerRef.current || !window.jwplayer) return;

      // Hủy player cũ nếu có
      if (playerRef.current) {
        try {
          playerRef.current.remove();
        } catch (e) {
          console.warn('Error removing old player instance:', e);
        }
      }

      try {
        // Cấu hình phụ đề (captions/tracks)
        const tracks = subtitles.map((sub) => ({
          file: sub.file,
          label: sub.label,
          kind: 'captions',
          default: sub.default || false
        }));

        // Khởi tạo JW Player
        const player = window.jwplayer(containerRef.current).setup({
          file: url,
          image: poster || '',
          title: title,
          description: siteName,
          autostart: false,
          width: '100%',
          height: '100%',
          aspectratio: '16:9',
          stretching: 'uniform',
          tracks: tracks,
          sharing: {
            code: `<iframe src="${siteUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`,
            link: siteUrl
          },
          cast: {},
          logo: {
            file: '/logo-icon.gif',
            link: siteUrl,
            hide: false,
            position: 'top-right',
            margin: 15
          },
          skin: {
            name: 'glow',
            active: '#1e88e5',
            inactive: '#ffffff',
            background: 'rgba(11, 10, 12, 0.85)'
          }
        });

        playerRef.current = player;

        // Custom buttons inside control bar: Rewind 10s and Forward 10s
        const svgRewind10 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.3 8.35h-.8v-3.7h-.9v-.7h1.7v4.4zm3.15-.35c0 .3-.05.55-.15.75s-.24.35-.41.45-.37.15-.59.15-.42-.05-.59-.15-.31-.25-.41-.45-.15-.45-.15-.75v-1.7c0-.3.05-.55.15-.75s.24-.35.41-.45.37-.15.59-.15.42.05.59.15.31.25.41.45.15.45.15.75v1.7zm-.8-1.75c0-.15-.02-.27-.06-.35s-.1-.12-.19-.12-.15.04-.19.12-.06.2-.06.35v1.8c0 .15.02.27.06.35s.1.12.19.12.15-.04.19-.12.06-.2.06-.35v-1.8z"/></svg>';
        const svgForward10 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M12 5v4c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm1.7 8.35h-.8v-3.7h-.9v-.7h1.7v4.4zm3.15-.35c0 .3-.05.55-.15.75s-.24.35-.41.45-.37.15-.59.15-.42-.05-.59-.15-.31-.25-.41-.45-.15-.45-.15-.75v-1.7c0-.3.05-.55.15-.75s.24-.35.41-.45.37-.15.59-.15.42.05.59.15.31.25.41.45.15.45.15.75v1.7zm-.8-1.75c0-.15-.02-.27-.06-.35s-.1-.12-.19-.12-.15.04-.19.12-.06.2-.06.35v1.8c0 .15.02.27.06.35s.1.12.19.12.15-.04.19-.12.06-.2.06-.35v-1.8z"/></svg>';

        player.on('ready', () => {
          if (active) {
            setLoading(false);
            console.log('%c[TXAPlayer] Ready', 'color: #1e88e5; font-weight: bold; font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.15);');
            
            // Add custom buttons
            player.addButton(svgRewind10, 'Tua lại 10s', () => {
              player.seek(Math.max(0, player.getPosition() - 10));
            }, 'txa-rewind-10', 'play');

            player.addButton(svgForward10, 'Tua tiếp 10s', () => {
              player.seek(Math.min(player.getDuration(), player.getPosition() + 10));
            }, 'txa-forward-10', 'play');
          }
        });

        player.on('play', () => {
          if (active) setIsPlaying(true);
        });

        player.on('pause', () => {
          if (active) setIsPlaying(false);
        });

        player.on('error', (err: any) => {
          console.error('JW Player Error:', err);
          if (active) {
            setErrorMsg('Không thể tải hoặc phát video. Vui lòng kiểm tra lại đường truyền.');
            setLoading(false);
          }
        });

        // Theo dõi tiến trình phát để auto skip / hiện nút skip
        player.on('time', (e: { position: number; duration: number }) => {
          if (!active) return;
          const pos = e.position;
          const dur = e.duration;
          
          setCurrentTime(pos);
          setDuration(dur);

          // Xử lý Skip Intro
          if (timeIntroStart > 0 && timeIntroEnd > 0 && pos >= timeIntroStart && pos < timeIntroEnd) {
            if (isAutoSkipEnabled) {
              if (!hasAutoSkippedIntro.current) {
                player.seek(timeIntroEnd);
                hasAutoSkippedIntro.current = true;
                showToast('Đã tự động bỏ qua đoạn giới thiệu (Intro) ⏭️');
              }
            } else {
              setShowSkipIntroBtn(true);
            }
          } else {
            setShowSkipIntroBtn(false);
          }

          // Xử lý Skip Outro
          if (timeOutroStart > 0 && dur > 0 && pos >= timeOutroStart && pos < dur - 2) {
            if (isAutoSkipEnabled) {
              if (!hasAutoSkippedOutro.current) {
                player.seek(dur);
                hasAutoSkippedOutro.current = true;
                showToast('Đã tự động bỏ qua đoạn kết thúc (Outro) ⏭️');
              }
            } else {
              setShowSkipOutroBtn(true);
            }
          } else {
            setShowSkipOutroBtn(false);
          }
        });

        // Hủy cờ auto skip khi người dùng tua lùi lại trước đoạn intro/outro
        player.on('seek', (e: { offset: number }) => {
          if (e.offset < timeIntroStart) {
            hasAutoSkippedIntro.current = false;
          }
          if (e.offset < timeOutroStart) {
            hasAutoSkippedOutro.current = false;
          }
        });

        // Xử lý chuyển đổi chất lượng nguồn phát thủ công
        player.on('levelsChanged', (e: any) => {
          if (onChangeQuality && qualities[e.currentQuality]) {
            onChangeQuality(qualities[e.currentQuality]);
          }
        });

      } catch (err: any) {
        console.error('Init player failed:', err);
        if (active) {
          setErrorMsg('Khởi tạo trình phát thất bại.');
          setLoading(false);
        }
      }
    };

    if (window.jwplayer) {
      initPlayer();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.src = '/js/jwplayer.js';
        script.async = true;
        document.head.appendChild(script);
      }

      const handleLoad = () => {
        if (active) initPlayer();
      };

      script.addEventListener('load', handleLoad);

      const checkInterval = setInterval(() => {
        if (window.jwplayer) {
          clearInterval(checkInterval);
          if (active) initPlayer();
        }
      }, 200);

      return () => {
        active = false;
        script.removeEventListener('load', handleLoad);
        clearInterval(checkInterval);
      };
    }

    return () => {
      active = false;
      if (playerRef.current) {
        try {
          playerRef.current.remove();
        } catch (e) {
          console.warn('Cleanup failed:', e);
        }
      }
    };
  }, [url, subtitles, poster, title, isOffline, isAutoSkipEnabled]);

  // Phím tắt điều khiển (Space, Mũi tên Trái/Phải/Lên/Xuống, M, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const player = playerRef.current;
      if (!player) return;

      // Tránh bắt phím tắt khi người dùng gõ vào các ô nhập liệu
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }

      const key = (e.key || '').toLowerCase();
      const code = e.code;

      if (code === 'Space' || key === 'k') {
        e.preventDefault();
        const state = player.getState();
        if (state === 'playing') player.pause();
        else player.play();
      } else if (code === 'ArrowLeft' || key === 'j') {
        e.preventDefault();
        const newPos = Math.max(0, player.getPosition() - 5);
        player.seek(newPos);
        showToast('Tua lại 5 giây ⏪');
      } else if (code === 'ArrowRight' || key === 'l') {
        e.preventDefault();
        const newPos = Math.min(player.getDuration(), player.getPosition() + 5);
        player.seek(newPos);
        showToast('Tua tiếp 5 giây ⏩');
      } else if (code === 'ArrowUp') {
        e.preventDefault();
        const newVol = Math.min(100, player.getVolume() + 10);
        player.setVolume(newVol);
        showToast(`Âm lượng: ${Math.round(newVol)}% 🔊`);
      } else if (code === 'ArrowDown') {
        e.preventDefault();
        const newVol = Math.max(0, player.getVolume() - 10);
        player.setVolume(newVol);
        showToast(`Âm lượng: ${Math.round(newVol)}% 🔉`);
      } else if (key === 'm') {
        e.preventDefault();
        const isMuted = player.getMute();
        player.setMute(!isMuted);
        showToast(!isMuted ? 'Tắt tiếng 🔇' : 'Bật tiếng 🔊');
      } else if (key === 'f') {
        e.preventDefault();
        player.setFullscreen(!player.getFullscreen());
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Cử chỉ chạm nhấp đúp để tua trên thiết bị di động
  let lastTapTime = 0;
  let lastTapX = 0;
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Bỏ qua nếu chạm vào thanh điều khiển
    if (target.closest('.jw-controls') || target.closest('.jw-settings') || target.closest('button')) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 350;
    const touch = e.changedTouches[0];
    if (!touch) return;

    if (now - lastTapTime < DOUBLE_TAP_DELAY && Math.abs(touch.clientX - lastTapX) < 80) {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const width = rect.width;
      const player = playerRef.current;
      if (!player) return;

      if (touchX < width * 0.4) {
        player.seek(Math.max(0, player.getPosition() - 10));
        showToast('Tua lại 10 giây ⏪');
      } else if (touchX > width * 0.6) {
        player.seek(Math.min(player.getDuration(), player.getPosition() + 10));
        showToast('Tua tiếp 10 giây ⏩');
      } else {
        const state = player.getState();
        if (state === 'playing') player.pause();
        else player.play();
      }
      e.preventDefault();
    }
    lastTapTime = now;
    lastTapX = touch.clientX;
  };

  const handleSkipIntroClick = () => {
    if (playerRef.current) {
      playerRef.current.seek(timeIntroEnd);
      hasAutoSkippedIntro.current = true;
      setShowSkipIntroBtn(false);
      showToast('Đã bỏ qua đoạn giới thiệu (Intro) ⏭️');
    }
  };

  const handleSkipOutroClick = () => {
    if (playerRef.current) {
      playerRef.current.seek(duration);
      hasAutoSkippedOutro.current = true;
      setShowSkipOutroBtn(false);
      showToast('Đã bỏ qua đoạn kết thúc (Outro) ⏭️');
    }
  };

  return (
    <div 
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full aspect-video rounded-2xl overflow-hidden bg-[#0A090C] border border-[#ffffff15] shadow-[0_20px_50px_rgba(0,0,0,0.8)] group transition-all duration-500 hover:shadow-[0_20px_60px_rgba(30,136,229,0.12)] hover:border-[#1e88e520] select-none"
    >
      <style>{`
        /* Sửa lỗi volume slider bị biến mất lập tức khi hover */
        .jwplayer .jw-icon-volume {
          position: relative !important;
          overflow: visible !important;
        }
        .jwplayer .jw-slider-volume {
          background: rgba(10, 9, 12, 0.98) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 12px !important;
          padding: 12px 6px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6) !important;
          margin-bottom: 3px !important;
        }
        /* Ép buộc thanh trượt hiển thị liên tục khi hover hoặc rê chuột */
        .jwplayer .jw-icon-volume:hover .jw-slider-volume,
        .jwplayer .jw-slider-volume:hover,
        .jwplayer .jw-slider-volume:active,
        .jwplayer .jw-slider-volume.jw-slider-active {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }

        /* Tùy chỉnh thanh điều khiển JW Player cho sang trọng hơn */
        .jw-skin-glow .jw-controlbar {
          background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(10,9,12,0.95) 100%) !important;
          border-radius: 0 0 16px 16px !important;
          padding: 12px 18px !important;
        }
        .jwplayer.jw-flag-user-inactive .jw-controlbar {
          opacity: 0 !important;
          transform: translateY(8px) !important;
          transition: all 0.35s ease-in-out !important;
        }
        .jw-controlbar {
          transform: translateY(0) !important;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .jw-slider-time {
          background: rgba(255,255,255,0.08) !important;
          border-radius: 4px !important;
          height: 6px !important;
        }
        .jw-progress {
          background: linear-gradient(90deg, #1e88e5 0%, #60a5fa 100%) !important;
          box-shadow: 0 0 8px rgba(30,136,229,0.4) !important;
        }
        .jw-knob {
          background: #ffffff !important;
          box-shadow: 0 0 8px rgba(30,136,229,0.7) !important;
          border: 2px solid #1e88e5 !important;
        }
        .jw-icon {
          color: rgba(255, 255, 255, 0.9) !important;
          transition: color 0.2s ease, transform 0.2s ease !important;
        }
        .jw-icon:hover {
          color: #1e88e5 !important;
          transform: scale(1.1) !important;
        }
        
        /* Custom subtitle captions style */
        .jw-captions {
          font-family: 'Outfit', sans-serif !important;
          font-weight: 700 !important;
          text-shadow: 0 2px 8px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.8) !important;
        }
        .jw-text-track-container {
          bottom: 75px !important;
        }

        /* Ẩn các nút rác / không cần thiết */
        .jw-icon-rewind, .jw-icon-next {
          display: none !important;
        }
        
        /* Responsive chỉnh sửa chiều cao và kích thước icon */
        @media (max-width: 640px) {
          .jw-skin-glow .jw-controlbar {
            padding: 8px 10px !important;
          }
          .jw-text-track-container {
            bottom: 55px !important;
          }
        }
      `}</style>

      {/* Hiệu ứng mờ nền khi di chuột qua */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* HUD Overlay góc trên bên trái: Tên phim & Server */}
      <div className="absolute top-5 left-5 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0">
        <div className="flex items-center gap-3 backdrop-blur-md bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl shadow-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-widest text-[#1e88e5] font-black font-outfit">Đang phát</span>
            <span className="text-white text-xs font-bold font-outfit tracking-tight truncate max-w-[200px] md:max-w-[280px]">{title}</span>
          </div>
        </div>
      </div>

      {/* HUD Overlay góc trên bên phải: Công tắc "Tự động Skip" */}
      <div className="absolute top-5 right-5 z-20 pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0">
        <div 
          onClick={toggleAutoSkip}
          className="flex items-center gap-3.5 backdrop-blur-md bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl shadow-lg cursor-pointer hover:border-[#1e88e540] transition-colors"
        >
          <span className="text-[10px] text-zinc-300 font-bold font-outfit uppercase tracking-wider">Tự động Skip</span>
          {/* iOS Style Toggle Switch */}
          <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 ${isAutoSkipEnabled ? 'bg-[#1e88e5]' : 'bg-zinc-700'}`}>
            <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${isAutoSkipEnabled ? 'transform translate-x-3.5' : ''}`} />
          </div>
        </div>
      </div>

      {/* Toast Alert popup thông báo phát sáng */}
      {toastMsg && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-slide-up">
          <div className="bg-[#1e88e5]/90 border border-white/10 backdrop-blur-md text-white text-[11px] font-bold font-outfit px-4 py-2 rounded-xl shadow-[0_4px_20px_rgba(30,136,229,0.4)] flex items-center gap-2 whitespace-nowrap">
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Nút Skip Intro nổi bật */}
      {showSkipIntroBtn && (
        <button 
          onClick={handleSkipIntroClick}
          className="absolute bottom-20 right-6 z-30 pointer-events-auto flex items-center gap-2 font-outfit text-xs font-bold text-white bg-[#1e88e5] border border-white/10 hover:bg-[#1e88e5]/80 px-4 py-2.5 rounded-xl shadow-2xl transition-all active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">skip_next</span>
          <span>Bỏ qua Intro</span>
        </button>
      )}

      {/* Nút Skip Outro nổi bật */}
      {showSkipOutroBtn && (
        <button 
          onClick={handleSkipOutroClick}
          className="absolute bottom-20 right-6 z-30 pointer-events-auto flex items-center gap-2 font-outfit text-xs font-bold text-white bg-[#ef4444] border border-white/10 hover:bg-[#ef4444]/80 px-4 py-2.5 rounded-xl shadow-2xl transition-all active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">skip_next</span>
          <span>Bỏ qua Outro</span>
        </button>
      )}

      {/* Loading Skeleton */}
      {loading && !errorMsg && !isOffline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0a0c] z-30 animate-fade-in">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-t-[#1e88e5] border-r-transparent border-b-[#60a5fa] border-l-transparent animate-spin duration-1000" />
            <img src="/logo-icon.gif" alt="Logo" className="w-10 h-10 object-contain animate-pulse" />
          </div>
          <span className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.25em] mt-5 font-outfit animate-pulse">
            Đang khởi tạo trình phát TXAPlayer...
          </span>
        </div>
      )}

      {/* Trạng thái lỗi */}
      {errorMsg && !isOffline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0A0C]/95 border border-red-500/20 z-30 p-6 text-center">
          <span className="material-symbols-outlined text-red-500 text-5xl mb-4 animate-bounce">warning</span>
          <h3 className="text-white text-lg font-black font-outfit mb-2 uppercase tracking-wide">Đã xảy ra lỗi</h3>
          <p className="text-zinc-400 text-xs max-w-sm leading-relaxed mb-6 font-sans">{errorMsg}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/20 border-none cursor-pointer"
          >
            Tải lại trình phát
          </button>
        </div>
      )}

      {/* Trạng thái mất mạng */}
      {isOffline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0A0C]/95 border border-amber-500/20 z-30 p-6 text-center">
          <span className="material-symbols-outlined text-amber-500 text-5xl mb-4 animate-pulse">wifi_off</span>
          <h3 className="text-white text-lg font-black font-outfit mb-2 uppercase tracking-wide">Mất kết nối mạng</h3>
          <p className="text-zinc-400 text-xs max-w-sm leading-relaxed mb-6 font-sans">
            Không có kết nối internet. Vui lòng kết nối lại mạng để xem tiếp.
          </p>
        </div>
      )}

      {/* Container của JW Player */}
      <div className="w-full h-full">
        <div ref={containerRef} id="txa-jw-player-container" className="w-full h-full" />
      </div>
    </div>
  );
};
