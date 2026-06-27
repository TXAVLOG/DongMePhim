import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';

// Override HTMLVideoElement.prototype.requestPictureInPicture to prevent InvalidStateError before metadata is loaded
if (typeof window !== 'undefined' && typeof HTMLVideoElement !== 'undefined' && HTMLVideoElement.prototype.requestPictureInPicture) {
  const originalRequestPiP = HTMLVideoElement.prototype.requestPictureInPicture;
  HTMLVideoElement.prototype.requestPictureInPicture = function () {
    if (this.readyState < 1) { // 1 means HAVE_METADATA
      return new Promise((resolve, reject) => {
        const onLoadedMetadata = () => {
          this.removeEventListener('loadedmetadata', onLoadedMetadata);
          this.removeEventListener('error', onError);
          originalRequestPiP.call(this).then(resolve).catch(reject);
        };
        const onError = (e: any) => {
          this.removeEventListener('loadedmetadata', onLoadedMetadata);
          this.removeEventListener('error', onError);
          reject(new DOMException('Video metadata not loaded yet.', 'InvalidStateError'));
        };
        this.addEventListener('loadedmetadata', onLoadedMetadata);
        this.addEventListener('error', onError);
      });
    }
    return originalRequestPiP.call(this);
  };
}

// Override HTMLVideoElement.prototype.play to catch AbortError when media element is unmounted
if (typeof window !== 'undefined' && typeof HTMLVideoElement !== 'undefined' && HTMLVideoElement.prototype.play) {
  const originalPlay = HTMLVideoElement.prototype.play;
  HTMLVideoElement.prototype.play = function () {
    const promise = originalPlay.call(this);
    if (promise && typeof promise.catch === 'function') {
      return promise.catch((err: any) => {
        if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError' || (err.message && err.message.includes('interrupted')))) {
          return;
        }
        return Promise.reject(err);
      });
    }
    return promise;
  };
}

export interface Subtitle {
  label: string;
  file: string;
  kind?: string;
  default?: boolean;
}

interface QualityItem {
  html: string;
  url: string;
  default?: boolean;
}

interface ArtPlayerProps {
  url: string;
  title: string;
  poster?: string;
  currentTime?: number;
  onTimeUpdate?: (time: number, duration: number) => void;
  onEnded?: () => void;
  onPlayerReady?: (getTime: () => number) => void;
  subtitles?: Subtitle[];
  qualities?: QualityItem[];
  onChangeQuality?: (quality: QualityItem) => void;
  timeIntroStart?: number;
  timeIntroEnd?: number;
  timeOutroStart?: number;
  timeOutroEnd?: number;
  siteName?: string;
  siteUrl?: string;
  maxResolution?: 'SD' | 'HD' | 'FHD' | '4K';
  hideWatermark?: boolean;
  autoplay?: boolean;
}

const getAutoSkipSetting = (): boolean => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    const stored = localStorage.getItem('tsettings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return !!parsed.autoSkip;
    }
  } catch (e) {
    console.error('Error parsing tsettings:', e);
  }
  return false;
};

const setAutoSkipSetting = (value: boolean) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const stored = localStorage.getItem('tsettings');
    const parsed = stored ? JSON.parse(stored) : {};
    parsed.autoSkip = value;
    localStorage.setItem('tsettings', JSON.stringify(parsed));
  } catch (e) {
    console.error('Error saving tsettings:', e);
  }
};

export const ArtPlayer: React.FC<ArtPlayerProps> = ({
  url,
  title,
  poster,
  currentTime = 0,
  onTimeUpdate,
  onEnded,
  onPlayerReady,
  subtitles = [],
  qualities = [],
  onChangeQuality,
  timeIntroStart = 0,
  timeIntroEnd = 0,
  timeOutroStart = 0,
  timeOutroEnd = 0,
  siteName = 'DongMePhim',
  siteUrl = 'https://dongmephim.com',
  maxResolution = '4K',
  hideWatermark = false,
  autoplay = false
}) => {
  const artRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<Artplayer | null>(null);
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);
  const [connectionRestored, setConnectionRestored] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setConnectionRestored(false);
      if (playerInstanceRef.current) {
        try {
          if (playerInstanceRef.current.fullscreen) {
            playerInstanceRef.current.fullscreen = false;
          }
        } catch (e) {}
      }
    };
    const handleOnline = () => {
      setIsOffline(false);
      setConnectionRestored(true);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (isOffline || connectionRestored) return;
    if (!artRef.current) return;

    const getRealStreamUrl = (rawUrl: string): string => {
      if (!rawUrl) return '';
      if (rawUrl.includes('player.phimapi.com/player/?url=')) {
        try {
          const urlObj = new URL(rawUrl);
          const streamUrl = urlObj.searchParams.get('url');
          if (streamUrl) {
            return decodeURIComponent(streamUrl);
          }
        } catch (e) {
          console.error('Error parsing wrapped stream URL:', e);
        }
      }
      return rawUrl;
    };

    const realUrl = getRealStreamUrl(url);

    const initPlayer = (HlsClass: any) => {
      if (!artRef.current) return;

      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy(false);
      }
      artRef.current.innerHTML = '';

      let isAutoSkipEnabled = getAutoSkipSetting();
      const handleAutoSkipEvent = (e: any) => {
        isAutoSkipEnabled = e.detail;
      };
      window.addEventListener('txa-autoskip-changed', handleAutoSkipEvent);
      
      const isM3u8 = realUrl.includes('.m3u8') || realUrl.includes('stream');
      const defaultSub = subtitles?.find(s => s.default) || subtitles?.[0];

      const proxySubtitleUrl = (u: string) => {
        if (!u) return '';
        if (u.startsWith('/') || u.startsWith('blob:') || u.startsWith('data:')) {
          return u;
        }
        try {
          const parsed = new URL(u, window.location.origin);
          if (parsed.origin === window.location.origin) {
            return u;
          }
        } catch {
          return u;
        }
        return `/api/proxy-subtitle?url=${encodeURIComponent(u)}`;
      };

      const isValidSubUrl = (u?: string) => {
        if (!u) return false;
        try {
          if (u.startsWith('blob:')) return true;
          new URL(u, window.location.origin);
          return u.trim().length > 0 && (u.startsWith('http') || u.startsWith('/') || u.startsWith('blob:'));
        } catch { return false; }
      };
      const validDefaultSub = defaultSub && isValidSubUrl(defaultSub.file) ? defaultSub : undefined;

      const art = new Artplayer({
        container: artRef.current,
        url: realUrl,
        poster: poster || '',
        volume: 0.7,
        isLive: false,
        muted: false,
        autoplay: autoplay || false,
        pip: true,
        autoSize: false,
        autoMini: false,
        screenshot: false,
        setting: true,
        loop: false,
        flip: false,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: false,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: false,
        airplay: true,
        hotkey: true,
        // JWPlayer style settings
        theme: '#1e88e5',
        lang: 'vi',
        i18n: {
          'vi': {
            'Play': 'Phát',
            'Pause': 'Tạm dừng',
            'Volume': 'Âm lượng',
            'Mute': 'Tắt tiếng',
            'Unmute': 'Bật tiếng',
            'Mini Player': 'Trình phát thu nhỏ',
            'Screenshot': 'Chụp màn hình',
            'Setting': 'Cài đặt',
            'Fullscreen': 'Toàn màn hình',
            'Playback Rate': 'Tốc độ phát',
            'Aspect Ratio': 'Tỷ lệ khung hình',
            'Flip': 'Lật hình',
            'Normal': 'Bình thường',
            'Subtitle': 'Phụ đề',
            'Auto': 'Tự động',
            'Loop': 'Lặp lại',
            'Airplay': 'Phát qua Airplay',
            'PIP': 'Hình trong hình'
          } as any
        },
        // Tùy chỉnh menu chuột phải (thay thế menu mặc định)
        contextmenu: [
          {
            html: `<b>${siteName}</b>`,
            click: () => {
              const url = (siteUrl && !siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) ? siteUrl : window.location.origin;
              window.open(url, '_blank');
            }
          },
          {
            html: 'Tắt / Bật tiếng',
            click: () => { art.muted = !art.muted; }
          },
          {
            html: 'Bật / Tắt hình trong hình (PiP)',
            click: () => { art.pip = !art.pip; }
          }
        ],
        ...(validDefaultSub ? {
          subtitle: {
            url: proxySubtitleUrl(validDefaultSub.file),
            type: validDefaultSub.file.includes('.srt') ? 'srt' : 'vtt',
            encoding: 'utf-8',
            style: {
              color: '#fff',
              fontSize: '20px',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }
          }
        } : {}),
        highlight: [
          ...(timeIntroStart > 0 ? [{ time: timeIntroStart, text: 'Bắt đầu Intro' }] : []),
          ...(timeIntroEnd > 0 ? [{ time: timeIntroEnd, text: 'Kết thúc Intro' }] : []),
          ...(timeOutroStart > 0 ? [{ time: timeOutroStart, text: 'Bắt đầu Outro' }] : []),
        ],
        customType: {
          m3u8: function (video: HTMLVideoElement, url: string) {
            if (HlsClass && HlsClass.isSupported()) {
              const hls = new HlsClass();
              hls.loadSource(url);
              hls.attachMedia(video);
              
              hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
                let maxAllowedHeight = 99999;
                if (maxResolution === 'SD') maxAllowedHeight = 480;
                else if (maxResolution === 'HD') maxAllowedHeight = 720;
                else if (maxResolution === 'FHD') maxAllowedHeight = 1080;
                
                const allowedLevels: number[] = [];
                hls.levels.forEach((level: any, index: number) => {
                  if (level.height <= maxAllowedHeight) {
                    allowedLevels.push(index);
                  }
                });

                if (allowedLevels.length > 0) {
                  const maxIndex = Math.max(...allowedLevels);
                  hls.maxAutoLevel = maxIndex;
                  if (hls.currentLevel > maxIndex) {
                    hls.currentLevel = maxIndex;
                  }
                }
              });

              hls.on(HlsClass.Events.LEVEL_SWITCHING, (event: any, data: any) => {
                let maxAllowedHeight = 99999;
                if (maxResolution === 'SD') maxAllowedHeight = 480;
                else if (maxResolution === 'HD') maxAllowedHeight = 720;
                else if (maxResolution === 'FHD') maxAllowedHeight = 1080;

                const targetLevel = hls.levels[data.level];
                if (targetLevel && targetLevel.height > maxAllowedHeight) {
                  let maxIndex = 0;
                  hls.levels.forEach((level: any, index: number) => {
                    if (level.height <= maxAllowedHeight && index > maxIndex) {
                      maxIndex = index;
                    }
                  });
                  hls.currentLevel = maxIndex;
                  art.notice.show = `Chất lượng ${targetLevel.height}p yêu cầu nâng cấp gói cước!`;
                }
              });

              art.on('destroy', () => {
                hls.destroy();
              });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = url;
            } else {
              art.notice.show = 'Trình duyệt không hỗ trạng định dạng m3u8';
            }
          },
        },
        type: isM3u8 ? 'm3u8' : undefined,
        // Watermark (Logo tĩnh cố định + Watermark bay ngẫu nhiên)
        layers: [
          ...(!hideWatermark ? [
            {
              name: 'txa-watermark-fixed',
              html: `
                <div class="txa-watermark-wrapper" style="pointer-events: none; user-select: none; display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.55); padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
                  <img src="/logo-icon.gif" style="height: 18px; width: auto; object-fit: contain;" />
                  <span style="font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 800; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${siteName}</span>
                </div>
              `,
              style: {
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: '20',
              },
            },
            {
              name: 'txa-watermark-floating',
              html: `
                <div class="txa-watermark-floating-box" style="font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.95); background: rgba(15,15,20,0.7); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(3px); white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 6px; height: 6px; background: #d2bbff; border-radius: 50%; box-shadow: 0 0 8px #d2bbff;"></span>
                  <span>${siteName} - ${title}</span>
                </div>
              `,
              style: {
                position: 'absolute',
                zIndex: '25',
                pointerEvents: 'none',
                animation: 'floatWatermark 16s ease-in-out infinite alternate'
              }
            }
          ] : []),
          {
            name: 'txa-skip-intro',
            html: `
              <button class="txa-skip-btn" style="display: none; align-items: center; gap: 8px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: white; background: rgba(30, 136, 229, 0.85); border: 1px solid rgba(255, 255, 255, 0.2); padding: 10px 18px; border-radius: 12px; cursor: pointer; backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); transition: all 0.2s ease-in-out;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4" fill="currentColor"></polygon>
                  <line x1="19" y1="5" x2="19" y2="19"></line>
                </svg>
                <span>Bỏ qua giới thiệu</span>
              </button>
            `,
            style: {
              position: 'absolute',
              bottom: '80px',
              right: '20px',
              zIndex: '30',
            },
            click: function () {
              const art = playerInstanceRef.current;
              if (art && timeIntroEnd > 0) {
                art.currentTime = timeIntroEnd;
                art.notice.show = 'Đã bỏ qua đoạn giới thiệu (Intro)';
                const btn = art.template.$container.querySelector('.art-layer-txa-skip-intro button') as HTMLElement;
                if (btn) btn.style.display = 'none';
              }
            }
          },
          {
            name: 'txa-skip-outro',
            html: `
              <button class="txa-skip-btn" style="display: none; align-items: center; gap: 8px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: white; background: rgba(30, 136, 229, 0.85); border: 1px solid rgba(255, 255, 255, 0.2); padding: 10px 18px; border-radius: 12px; cursor: pointer; backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); transition: all 0.2s ease-in-out;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4" fill="currentColor"></polygon>
                  <line x1="19" y1="5" x2="19" y2="19"></line>
                </svg>
                <span>Bỏ qua Outro</span>
              </button>
            `,
            style: {
              position: 'absolute',
              bottom: '80px',
              right: '20px',
              zIndex: '30',
            },
            click: function () {
              const art = playerInstanceRef.current;
              if (art) {
                const duration = art.duration;
                if (duration) {
                  art.currentTime = duration;
                  art.notice.show = 'Đã bỏ qua đoạn kết thúc (Outro)';
                  const btn = art.template.$container.querySelector('.art-layer-txa-skip-outro button') as HTMLElement;
                  if (btn) btn.style.display = 'none';
                }
              }
            }
          }
        ],
      });

      // --- Menu Cài đặt (Gear icon) Tùy chỉnh thay thế toàn bộ mặc định ---

      if (qualities && qualities.length > 0) {
        art.setting.add({
          width: 200,
          html: 'Chất lượng',
          tooltip: qualities.find(q => q.default)?.html || qualities[0]?.html || 'Auto',
          selector: qualities,
          onSelect: function (item: any) {
            if (onChangeQuality) {
              onChangeQuality(item);
            }
            return item.html;
          }
        });
      }

      const validSubs = (subtitles || []).filter(s => isValidSubUrl(s.file));
      if (validSubs.length > 0) {
        art.setting.add({
          width: 200,
          html: 'Phụ đề',
          tooltip: validDefaultSub ? validDefaultSub.label : 'Tắt',
          selector: [
            {
              html: 'Tắt phụ đề',
              url: '',
            },
            ...validSubs.map(sub => ({
              html: sub.label,
              url: proxySubtitleUrl(sub.file),
              default: sub.file === validDefaultSub?.file
            }))
          ],
          onSelect: function (item: any) {
            if (item.url) {
              art.subtitle.url = item.url;
              art.notice.show = `Đã bật phụ đề: ${item.html}`;
            } else {
              art.subtitle.url = '';
              art.notice.show = 'Đã tắt phụ đề';
            }
            return item.html;
          },
        });
      }

      // Sửa lỗi toggle update dom ngay lập tức
      art.setting.add({
        width: 200,
        html: 'Tự động Skip',
        tooltip: isAutoSkipEnabled ? 'Bật' : 'Tắt',
        switch: isAutoSkipEnabled,
        onSelect: function (item: any) {
          const nextState = !item.switch;
          setAutoSkipSetting(nextState);
          isAutoSkipEnabled = nextState;
          item.tooltip = nextState ? 'Bật' : 'Tắt';
          art.notice.show = `Tự động Skip: ${nextState ? 'Bật' : 'Tắt'}`;
          return nextState;
        },
      });

      playerInstanceRef.current = art;

      // Double-tap seeking on mobile (left/right side double tap)
      let lastTap = 0;
      const handleTouchEnd = (e: TouchEvent) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTap < DOUBLE_TAP_DELAY) {
          const videoEl = art.template.$video;
          if (!videoEl) return;
          
          const rect = videoEl.getBoundingClientRect();
          const touchX = e.changedTouches[0].clientX - rect.left;
          const width = rect.width;
          
          if (touchX < width * 0.35) {
            // Seek back 10s
            art.currentTime = Math.max(0, art.currentTime - 10);
            art.notice.show = 'Tua lại 10 giây ⏪';
          } else if (touchX > width * 0.65) {
            // Seek forward 10s
            art.currentTime = Math.min(art.duration, art.currentTime + 10);
            art.notice.show = 'Tua tiếp 10 giây ⏩';
          }
          e.preventDefault(); // Prevent zoom/default pause behavior on double click
        }
        lastTap = now;
      };

      const videoElement = art.template.$video;
      if (videoElement) {
        videoElement.addEventListener('touchend', handleTouchEnd);
      }

      art.on('ready', () => {
        // Auto-focus player so hotkeys work immediately
        art.isFocus = true;

        if (currentTime > 0) {
          art.currentTime = currentTime;
          art.notice.show = `Đã khôi phục tiến trình xem: ${Math.floor(currentTime / 60)} phút ${Math.floor(currentTime % 60)} giây`;
        }
        if (onPlayerReady) {
          onPlayerReady(() => art.currentTime || 0);
        }
      });

      // Keep focus on hover and play so hotkeys always work
      art.on('hover', (state: boolean) => {
        if (state) art.isFocus = true;
      });
      art.on('play', () => {
        art.isFocus = true;
      });

      let lastUpdatedTime = 0;
      let hasAutoSkippedIntro = false;
      let hasAutoSkippedOutro = false;

      art.on('video:timeupdate', () => {
        const now = art.currentTime;
        const duration = art.duration;

        if (timeIntroStart > 0 && timeIntroEnd > 0 && timeIntroEnd > timeIntroStart) {
          const skipIntroBtn = art.template.$container.querySelector('.art-layer-txa-skip-intro button') as HTMLElement;

          if (now >= timeIntroStart && now < timeIntroEnd) {
            if (isAutoSkipEnabled) {
              if (!hasAutoSkippedIntro) {
                art.currentTime = timeIntroEnd;
                hasAutoSkippedIntro = true;
                art.notice.show = 'Đã tự động bỏ qua đoạn giới thiệu (Intro)';
                if (skipIntroBtn) skipIntroBtn.style.display = 'none';
              }
            } else {
              if (skipIntroBtn && skipIntroBtn.style.display !== 'flex') {
                skipIntroBtn.style.display = 'flex';
              }
            }
          } else {
            if (skipIntroBtn && skipIntroBtn.style.display !== 'none') {
              skipIntroBtn.style.display = 'none';
            }
          }
        }

        if (timeOutroStart > 0 && duration && timeOutroStart < duration) {
          const skipOutroBtn = art.template.$container.querySelector('.art-layer-txa-skip-outro button') as HTMLElement;

          if (now >= timeOutroStart && now < duration - 2) {
            if (isAutoSkipEnabled) {
              if (!hasAutoSkippedOutro) {
                art.currentTime = duration;
                hasAutoSkippedOutro = true;
                art.notice.show = 'Đã tự động bỏ qua đoạn kết thúc (Outro)';
                if (skipOutroBtn) skipOutroBtn.style.display = 'none';
              }
            } else {
              if (skipOutroBtn && skipOutroBtn.style.display !== 'flex') {
                skipOutroBtn.style.display = 'flex';
              }
            }
          } else {
            if (skipOutroBtn && skipOutroBtn.style.display !== 'none') {
              skipOutroBtn.style.display = 'none';
            }
          }
        }

        if (Math.abs(now - lastUpdatedTime) >= 5) {
          lastUpdatedTime = now;
          if (onTimeUpdate) {
            onTimeUpdate(now, duration);
          }
        }
      });

      art.on('video:ended', () => {
        if (onEnded) {
          onEnded();
        }
      });

      const checkWatermarkIntegrity = () => {
        if (hideWatermark) return;
        const watermarkEl = art.template.$container.querySelector('.art-layer-txa-watermark-fixed');
        if (!watermarkEl) {
          triggerViolation('Thiếu bản quyền! Vui lòng không can thiệp mã nguồn.');
          return;
        }

        const style = window.getComputedStyle(watermarkEl);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          parseFloat(style.opacity) < 0.1 ||
          parseInt(style.width) === 0 ||
          parseInt(style.height) === 0
        ) {
          triggerViolation('Bản quyền bị ẩn! Vui lòng hiển thị watermark.');
        }
      };

      const triggerViolation = (message: string) => {
        art.pause();
        let overlay = art.template.$container.querySelector('.txa-violation-overlay') as HTMLElement;
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'txa-violation-overlay';
          overlay.style.cssText = `
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999;
            color: #ff4d4f;
            font-family: 'Outfit', sans-serif;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
          `;
          overlay.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 12px;">warning</span>
            <div>${message}</div>
            <button onclick="window.location.reload()" style="margin-top: 15px; background: #1e88e5; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; transition: background 0.2s;">
              Tải lại trang
            </button>
          `;
          art.template.$container.appendChild(overlay);
        }
      };

      const intervalId = setInterval(checkWatermarkIntegrity, 3000);
      
      const observer = new MutationObserver((mutations) => {
        if (hideWatermark) return;
        for (const mutation of mutations) {
          if (mutation.removedNodes.length > 0) {
            const hasWatermarkRemoved = Array.from(mutation.removedNodes).some(node => {
              return (node as HTMLElement).classList?.contains('art-layer-txa-watermark-fixed') || 
                     (node as HTMLElement).querySelector?.('.txa-watermark-wrapper');
            });
            if (hasWatermarkRemoved) {
              triggerViolation('Thiếu bản quyền! Vui lòng không can thiệp mã nguồn.');
            }
          }
          if (mutation.type === 'attributes') {
            const target = mutation.target as HTMLElement;
            if (target.classList?.contains('art-layer-txa-watermark-fixed') || target.querySelector?.('.txa-watermark-wrapper')) {
              checkWatermarkIntegrity();
            }
          }
        }
      });

      observer.observe(art.template.$container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden']
      });

      art.on('destroy', () => {
        clearInterval(intervalId);
        observer.disconnect();
        window.removeEventListener('txa-autoskip-changed', handleAutoSkipEvent);
        if (videoElement) {
          videoElement.removeEventListener('touchend', handleTouchEnd);
        }
      });
    };

    let checkInterval: any = null;
    if (realUrl.includes('.m3u8') || realUrl.includes('stream')) {
      if ((window as any).Hls) {
        initPlayer((window as any).Hls);
      } else {
        let script = document.querySelector('script[src*="hls.min.js"]') as HTMLScriptElement;
        if (!script) {
          script = document.createElement('script');
          script.id = 'hls-js-script';
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js';
          script.async = true;
          document.head.appendChild(script);
        }
        
        const onLoad = () => {
          if ((window as any).Hls) {
            initPlayer((window as any).Hls);
            if (checkInterval) clearInterval(checkInterval);
          }
        };

        script.addEventListener('load', onLoad);

        checkInterval = setInterval(() => {
          if ((window as any).Hls) {
            initPlayer((window as any).Hls);
            clearInterval(checkInterval);
          }
        }, 100);

        return () => {
          script.removeEventListener('load', onLoad);
          if (checkInterval) clearInterval(checkInterval);
          if (playerInstanceRef.current) {
            playerInstanceRef.current.destroy(false);
          }
        };
      }
    } else {
      initPlayer(null);
    }

    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy(false);
      }
      if (artRef.current) {
        artRef.current.innerHTML = '';
      }
    };
  }, [url, title]);

  return (
    <>
      <style>{`
        @keyframes floatWatermark {
          0% { top: 10%; left: 5%; }
          25% { top: 75%; left: 30%; }
          50% { top: 40%; left: 75%; }
          75% { top: 85%; left: 60%; }
          100% { top: 15%; left: 80%; }
        }
        .art-layer-txa-watermark-floating {
          z-index: 99 !important;
        }
        .art-layer-txa-watermark-fixed {
          z-index: 98 !important;
        }
        .art-fullscreen .art-layer-txa-watermark-floating .txa-watermark-floating-box {
          font-size: 14px !important;
          padding: 6px 14px !important;
        }
        .art-fullscreen .art-layer-txa-watermark-fixed {
          top: 30px !important;
          right: 30px !important;
        }
        .art-fullscreen .art-layer-txa-watermark-fixed .txa-watermark-wrapper {
          padding: 6px 14px !important;
        }
      `}</style>
      {isOffline && (
        <div 
          className="w-full h-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-red-500/30 bg-[#0B0A0C]/95 flex flex-col items-center justify-center text-center p-6"
          style={{ minHeight: '350px' }}
        >
          <span className="material-symbols-outlined text-red-500 text-5xl mb-4 animate-pulse">wifi_off</span>
          <h3 className="text-white text-lg font-black font-outfit mb-2 uppercase tracking-wide">Mất kết nối mạng</h3>
          <p className="text-zinc-400 text-xs max-w-sm leading-relaxed mb-6 font-sans">
            Đang xem giữa chừng thì mất mạng rồi! Vui lòng kiểm tra lại kết nối internet để tiếp tục xem phim.
          </p>
        </div>
      )}
      {connectionRestored && (
        <div 
          className="w-full h-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-emerald-500/30 bg-[#0B0A0C]/95 flex flex-col items-center justify-center text-center p-6"
          style={{ minHeight: '350px' }}
        >
          <span className="material-symbols-outlined text-emerald-400 text-5xl mb-4 animate-bounce">wifi</span>
          <h3 className="text-white text-lg font-black font-outfit mb-2 uppercase tracking-wide">Đã có mạng trở lại</h3>
          <p className="text-zinc-400 text-xs max-w-sm leading-relaxed mb-6 font-sans">
            Kết nối internet đã được khôi phục. Vui lòng tải lại trình phát để tiếp tục xem phim.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 border-none cursor-pointer"
          >
            Tải lại trình phát
          </button>
        </div>
      )}
      {!isOffline && !connectionRestored && (
        <div 
          ref={artRef} 
          className="w-full h-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-glass-stroke" 
          style={{ minHeight: '350px' }}
        />
      )}
    </>
  );
};