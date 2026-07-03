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
  storyboardUrl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);

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
          // Cấu hình cao cấp và thẩm mỹ
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

        player.on('ready', () => {
          if (active) {
            setLoading(false);
            console.log('TXAPlayer (JW Player) is ready!');
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

      // Dự phòng kiểm tra nếu script load xong trước listener
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
  }, [url, subtitles, poster, title, isOffline]);

  return (
    <div className="relative w-full h-full aspect-video rounded-2xl overflow-hidden bg-[#0A090C] border border-[#ffffff15] shadow-[0_20px_50px_rgba(0,0,0,0.8)] group transition-all duration-500 hover:shadow-[0_20px_60px_rgba(30,136,229,0.15)] hover:border-[#1e88e530]">
      {/* CSS Styles cho các thành phần custom */}
      <style>{`
        /* Tùy chỉnh thanh điều khiển JW Player cho sang trọng hơn */
        .jw-skin-glow .jw-controlbar {
          background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(10,9,12,0.95) 100%) !important;
          border-radius: 0 0 16px 16px !important;
          padding: 10px 15px !important;
        }
        .jwplayer.jw-flag-user-inactive .jw-controlbar {
          opacity: 0 !important;
          transform: translateY(8px) !important;
          transition: all 0.3s ease-in-out !important;
        }
        .jw-controlbar {
          transform: translateY(0) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .jw-slider-time {
          background: rgba(255,255,255,0.1) !important;
          border-radius: 4px !important;
          height: 6px !important;
        }
        .jw-progress {
          background: linear-gradient(90deg, #1e88e5 0%, #60a5fa 100%) !important;
          box-shadow: 0 0 10px rgba(30,136,229,0.5) !important;
        }
        .jw-knob {
          background: #ffffff !important;
          box-shadow: 0 0 10px rgba(30,136,229,0.8) !important;
          border: 2px solid #1e88e5 !important;
        }
        .jw-icon {
          color: #ffffff !important;
          transition: color 0.2s ease, transform 0.2s ease !important;
        }
        .jw-icon:hover {
          color: #1e88e5 !important;
          transform: scale(1.1) !important;
        }
        .jw-cue {
          background-color: #fbbf24 !important;
        }
        /* Custom subtitle captions style */
        .jw-captions {
          font-family: 'Outfit', sans-serif !important;
          font-weight: 600 !important;
          text-shadow: 0 2px 8px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.8) !important;
        }
        .jw-text-track-container {
          bottom: 70px !important;
        }
      `}</style>

      {/* Hiệu ứng mờ nền khi di chuột qua */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Tên phim hiển thị nghệ thuật ở góc trên bên trái */}
      {isPlaying && (
        <div className="absolute top-5 left-5 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0">
          <div className="flex flex-col gap-1 backdrop-blur-md bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl shadow-lg">
            <span className="text-[10px] uppercase tracking-widest text-[#1e88e5] font-black font-outfit">Đang phát</span>
            <span className="text-white text-xs font-bold font-outfit tracking-tight truncate max-w-[280px]">{title}</span>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !errorMsg && !isOffline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0a0c] z-30 animate-fade-in">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Vòng xoay phát sáng gradient */}
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
