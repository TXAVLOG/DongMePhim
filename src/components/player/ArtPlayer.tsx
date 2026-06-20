import React, { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';

export interface Subtitle {
  label: string;
  file: string;
  kind?: string;
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
  timeIntroStart?: number;
  timeIntroEnd?: number;
  timeOutroStart?: number;
  timeOutroEnd?: number;
  siteName?: string;
  siteUrl?: string;
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
  timeIntroStart = 0,
  timeIntroEnd = 0,
  timeOutroStart = 0,
  timeOutroEnd = 0,
  siteName = 'DongMePhim',
  siteUrl = 'https://dongmephim.com'
}) => {
  const artRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<Artplayer | null>(null);

  useEffect(() => {
    if (!artRef.current) return;

    // Helper to extract real stream URL from third party wrapped URLs
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

    // Load Hls.js dynamically from CDN if not already loaded
    const initPlayer = (HlsClass: any) => {
      if (!artRef.current) return;

      // Clean up previous instance if any
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy(false);
      }

      let isAutoSkipEnabled = getAutoSkipSetting();
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

      // Validate subtitle URL before passing to ArtPlayer to prevent Failed to fetch
      const isValidSubUrl = (u?: string) => {
        if (!u) return false;
        try {
          new URL(u, window.location.origin);
          return u.trim().length > 0 && (u.startsWith('http') || u.startsWith('/'));
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
        autoplay: false,
        pip: true,
        autoSize: false,
        autoMini: true,
        screenshot: false,
        setting: true,
        loop: false,
        flip: true,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: true,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: false,
        airplay: true,
        ...(validDefaultSub ? {
          subtitle: {
            url: proxySubtitleUrl(validDefaultSub.file),
            type: validDefaultSub.file.endsWith('.srt') ? 'srt' : 'vtt',
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
              
              // Clean up hls on destroy
              art.on('destroy', () => {
                hls.destroy();
              });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = url;
            } else {
              art.notice.show = 'Trình duyệt không hỗ trợ định dạng m3u8';
            }
          },
        },
        type: isM3u8 ? 'm3u8' : undefined,
        // Watermark and Skip layers
        layers: [
          {
            name: 'txa-watermark',
            html: `
              <div class="txa-watermark-wrapper" style="pointer-events: none; user-select: none;">
                <div class="txa-watermark-text" style="font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 800; color: rgba(255, 255, 255, 0.45); text-shadow: 0 2px 4px rgba(0,0,0,0.8); background: rgba(0,0,0,0.25); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(2px);">
                  ${siteName} - ${siteUrl}
                </div>
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
            name: 'txa-skip-intro',
            html: `
              <button class="txa-skip-btn" style="display: none; align-items: center; gap: 8px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: white; background: rgba(124, 58, 237, 0.85); border: 1px solid rgba(255, 255, 255, 0.2); padding: 10px 18px; border-radius: 12px; cursor: pointer; backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); transition: all 0.2s ease-in-out;">
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
              <button class="txa-skip-btn" style="display: none; align-items: center; gap: 8px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: white; background: rgba(124, 58, 237, 0.85); border: 1px solid rgba(255, 255, 255, 0.2); padding: 10px 18px; border-radius: 12px; cursor: pointer; backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); transition: all 0.2s ease-in-out;">
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

      playerInstanceRef.current = art;

      // Handle seeking to current time
      art.on('ready', () => {
        if (currentTime > 0) {
          art.currentTime = currentTime;
          art.notice.show = `Đã khôi phục tiến trình xem: ${Math.floor(currentTime / 60)} phút ${Math.floor(currentTime % 60)} giây`;
        }
        // Expose getter for current time to parent component
        if (onPlayerReady) {
          onPlayerReady(() => art.currentTime || 0);
        }
      });

      // Add Subtitle switcher in Setting menu if multiple subtitles exist
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

      // Add Auto Skip Intro/Outro setting
      art.setting.add({
        width: 200,
        html: 'Tự động Skip',
        tooltip: isAutoSkipEnabled ? 'Bật' : 'Tắt',
        switch: isAutoSkipEnabled,
        onSelect: function (item: any) {
          const newValue = !isAutoSkipEnabled;
          setAutoSkipSetting(newValue);
          isAutoSkipEnabled = newValue;
          art.notice.show = `Tự động Skip: ${newValue ? 'Bật' : 'Tắt'}`;
          item.switch = newValue;
          item.tooltip = newValue ? 'Bật' : 'Tắt';
          
          // Update tooltip text in settings panel DOM immediately
          const settingItems = art.template.$container.querySelectorAll('.art-setting-item');
          if (settingItems) {
            settingItems.forEach((el: any) => {
              if (el.textContent?.includes('Tự động Skip')) {
                const tooltipEl = el.querySelector('.art-setting-tooltip');
                if (tooltipEl) {
                  tooltipEl.textContent = newValue ? 'Bật' : 'Tắt';
                }
              }
            });
          }
          
          return newValue;
        },
      });

      // Throttle time update notifications (every 5 seconds) & Skip Intro/Outro
      let lastUpdatedTime = 0;
      let hasAutoSkippedIntro = false;
      let hasAutoSkippedOutro = false;

      art.on('video:timeupdate', () => {
        const now = art.currentTime;
        const duration = art.duration;

        // Skip Intro logic
        if (timeIntroStart > 0 && timeIntroEnd > 0 && timeIntroEnd > timeIntroStart) {
          const skipIntroBtn = art.template.$container.querySelector('.art-layer-txa-skip-intro button') as HTMLElement;

          if (now >= timeIntroStart && now < timeIntroEnd) {
            if (isAutoSkipEnabled) {
              // Auto-skip
              if (!hasAutoSkippedIntro) {
                art.currentTime = timeIntroEnd;
                hasAutoSkippedIntro = true;
                art.notice.show = 'Đã tự động bỏ qua đoạn giới thiệu (Intro)';
                if (skipIntroBtn) skipIntroBtn.style.display = 'none';
              }
            } else {
              // Manual skip button
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

        // Skip Outro logic
        if (timeOutroStart > 0 && duration && timeOutroStart < duration) {
          const skipOutroBtn = art.template.$container.querySelector('.art-layer-txa-skip-outro button') as HTMLElement;

          if (now >= timeOutroStart && now < duration - 2) {
            if (isAutoSkipEnabled) {
              // Auto-skip
              if (!hasAutoSkippedOutro) {
                art.currentTime = duration;
                hasAutoSkippedOutro = true;
                art.notice.show = 'Đã tự động bỏ qua đoạn kết thúc (Outro)';
                if (skipOutroBtn) skipOutroBtn.style.display = 'none';
              }
            } else {
              // Manual skip button
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

        // Save progress trigger
        if (Math.abs(now - lastUpdatedTime) >= 5) {
          lastUpdatedTime = now;
          if (onTimeUpdate) {
            onTimeUpdate(now, duration);
          }
        }
      });

      // Handle ended
      art.on('video:ended', () => {
        if (onEnded) {
          onEnded();
        }
      });

      // --- Anti-Inspect Protection for Watermark ---
      const checkWatermarkIntegrity = () => {
        const watermarkEl = art.template.$container.querySelector('.art-layer-txa-watermark');

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
            <button onclick="window.location.reload()" style="margin-top: 15px; background: #7c3aed; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; transition: background 0.2s;">
              Tải lại trang
            </button>
          `;
          art.template.$container.appendChild(overlay);
        }
      };

      // Periodic check every 3 seconds
      const intervalId = setInterval(checkWatermarkIntegrity, 3000);
      
      // MutationObserver to detect element deletions or attribute modifications
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.removedNodes.length > 0) {
            const hasWatermarkRemoved = Array.from(mutation.removedNodes).some(node => {
              return (node as HTMLElement).classList?.contains('art-layer-txa-watermark') || 
                     (node as HTMLElement).querySelector?.('.txa-watermark-wrapper');
            });
            if (hasWatermarkRemoved) {
              triggerViolation('Thiếu bản quyền! Vui lòng không can thiệp mã nguồn.');
            }
          }
          if (mutation.type === 'attributes') {
            const target = mutation.target as HTMLElement;
            if (target.classList?.contains('art-layer-txa-watermark') || target.querySelector?.('.txa-watermark-wrapper')) {
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
      });
    };

    // Load hls.js script dynamically
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
    };
  }, [url, title]);

  return (
    <div 
      ref={artRef} 
      className="w-full h-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-glass-stroke" 
      style={{ minHeight: '350px' }}
    />
  );
};
