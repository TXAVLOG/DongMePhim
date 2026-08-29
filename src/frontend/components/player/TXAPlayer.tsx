import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface Subtitle {
  label: string;
  file: string;
  kind?: string;
  default?: boolean;
  cues?: SubtitleCue[];
}

export interface QualityItem {
  html: string;
  url: string;
  default?: boolean;
}

export interface AdSettings {
  pre_roll_enable?: boolean;
  pre_roll_type?: 'video' | 'embed';
  pre_roll_url?: string;
  pre_roll_skip_seconds?: number;
  click_ad_enable?: boolean;
  click_ad_code?: string;
  click_ad_threshold?: number;
}

export interface HistoryData {
  time: number;
  duration: number;
}

export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface TXAPlayerProps {
  url: string;
  title?: string;
  poster?: string;
  currentTime?: number;
  subtitles?: Subtitle[];
  qualities?: QualityItem[];
  onChangeQuality?: (item: QualityItem) => void;
  siteName?: string;
  siteUrl?: string;
  storyboardUrl?: string;
  timeIntroStart?: number;
  timeIntroEnd?: number;
  timeOutroStart?: number;
  timeOutroEnd?: number;
  time_intro_start?: number;
  time_intro_end?: number;
  time_outro_start?: number;
  time_outro_end?: number;
  ads?: AdSettings;
  adSettings?: any;
  vipOnly?: boolean;
  maxResolution?: 'SD' | 'HD' | 'FHD' | '4K' | string;
  hideWatermark?: boolean;
  disableInternalResume?: boolean;
  userIp?: string;
  onTimeUpdate?: (time: number, duration: number) => void | Promise<void> | any;
  onEnded?: () => void;
  onPlayerReady?: (getTime: () => number) => void;
  autoplay?: boolean;
  autoPlay?: boolean;
  autoNextEpisode?: boolean;
  nextEpisode?: {
    title: string;
    episodeName: string;
    thumbnail: string;
    slug: string;
  } | any;
  onNextEpisode?: () => void;
  prevEpisode?: {
    title: string;
    episodeName: string;
    thumbnail: string;
    slug: string;
  } | any;
  onPrevEpisode?: () => void;
  movieSlug?: string;
  episodeSlug?: string;
  className?: string;
}

// Storyboard VTT Cue
interface StoryboardCue {
  startTime: number;
  endTime: number;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ==========================================
// TOOLTIP COMPONENT (WITH KEYBOARD SHORTCUT)
// ==========================================

const TxaTooltip: React.FC<{
  title: string;
  shortcut?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, shortcut, children, className = '' }) => {
  const tooltipText = shortcut ? `${title} (${shortcut})` : title;
  return (
    <div
      data-txatooltip={tooltipText}
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
    >
      {children}
    </div>
  );
};

// ==========================================
// UTILITIES & SUBTITLE PARSER
// ==========================================

export function parseSubtitles(text: string): SubtitleCue[] {
  if (!text) return [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues: SubtitleCue[] = [];
  const timeRegex = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/;

  let currentCue: Partial<SubtitleCue> | null = null;
  let textBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim().replace(/\{[^}]+\}/g, '');
    const match = line.match(timeRegex);

    if (match) {
      if (currentCue && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
        currentCue.text = textBuffer.join('\n').trim();
        cues.push(currentCue as SubtitleCue);
      }

      const startSec =
        parseInt(match[1]) * 3600 +
        parseInt(match[2]) * 60 +
        parseInt(match[3]) +
        parseInt(match[4]) / 1000;

      const endSec =
        parseInt(match[5]) * 3600 +
        parseInt(match[6]) * 60 +
        parseInt(match[7]) +
        parseInt(match[8]) / 1000;

      let id = '';
      if (i > 0) {
        const prevLine = lines[i - 1].trim();
        if (prevLine && !prevLine.match(timeRegex) && !isNaN(Number(prevLine))) {
          id = prevLine;
        }
      }

      currentCue = {
        id: id || String(cues.length + 1),
        startTime: startSec,
        endTime: endSec,
        text: ''
      };
      textBuffer = [];
    } else {
      if (currentCue) {
        const nextLine = lines[i + 1]?.trim();
        if (line === '' && nextLine && nextLine.match(timeRegex)) {
          currentCue.text = textBuffer.join('\n').trim();
          cues.push(currentCue as SubtitleCue);
          currentCue = null;
          textBuffer = [];
        } else if (line !== '') {
          if (!isNaN(Number(line)) && nextLine && nextLine.match(timeRegex)) {
            currentCue.text = textBuffer.join('\n').trim();
            cues.push(currentCue as SubtitleCue);
            currentCue = null;
            textBuffer = [];
          } else {
            textBuffer.push(line);
          }
        }
      }
    }
  }

  if (currentCue && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
    currentCue.text = textBuffer.join('\n').trim();
    cues.push(currentCue as SubtitleCue);
  }

  return cues;
}

const proxySubtitleUrl = (u: string) => {
  if (!u) return '';
  if (u.startsWith('/') || u.startsWith('blob:') || u.startsWith('data:') || u.includes('/api/proxy-subtitle')) {
    return u;
  }
  try {
    const parsed = new URL(u, typeof window !== 'undefined' ? window.location.origin : 'https://dongmephim.online');
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return u;
    }
  } catch {
    return u;
  }
  return `/api/proxy-subtitle?url=${encodeURIComponent(u)}`;
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ==========================================
// MAIN TXAPlayer COMPONENT
// ==========================================

export const TXAPlayer: React.FC<TXAPlayerProps> = ({
  url,
  title = '',
  poster = '',
  currentTime = 0,
  subtitles = [],
  qualities = [],
  onChangeQuality,
  siteName = 'DongMePhim',
  siteUrl = 'https://dongmephim.com',
  storyboardUrl,
  timeIntroStart: rawTimeIntroStart = 0,
  timeIntroEnd: rawTimeIntroEnd = 0,
  timeOutroStart: rawTimeOutroStart = 0,
  timeOutroEnd: rawTimeOutroEnd = 0,
  time_intro_start: rawTimeIntroStartSnake,
  time_intro_end: rawTimeIntroEndSnake,
  time_outro_start: rawTimeOutroStartSnake,
  time_outro_end: rawTimeOutroEndSnake,
  maxResolution = '4K',
  hideWatermark = false,
  userIp,
  autoplay = false,
  autoPlay = false,
  autoNextEpisode = false,
  nextEpisode,
  onNextEpisode,
  prevEpisode,
  onPrevEpisode,
  onTimeUpdate,
  onEnded,
  onPlayerReady,
  className = ''
}) => {
  const isAutoPlay = autoplay || autoPlay;
  const timeIntroStart = Number(rawTimeIntroStart || rawTimeIntroStartSnake) || 0;
  const timeIntroEnd = Number(rawTimeIntroEnd || rawTimeIntroEndSnake) || 0;
  const timeOutroStart = Number(rawTimeOutroStart || rawTimeOutroStartSnake) || 0;
  const timeOutroEnd = Number(rawTimeOutroEnd || rawTimeOutroEndSnake) || 0;

  // Player Container & Media Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<any>(null);

  // Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('txa_player_volume');
      if (savedVol !== null) return parseFloat(savedVol);
    }
    return 0.8;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('txa_player_muted') === 'true';
    }
    return false;
  });
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedRate = localStorage.getItem('txa_player_playback_rate');
      if (savedRate !== null) return parseFloat(savedRate);
    }
    return 1;
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const noticeTimerRef = useRef<any>(null);

  // Watermark Dynamic IP
  const [displayIp, setDisplayIp] = useState<string>(userIp || '');

  useEffect(() => {
    if (userIp) {
      setDisplayIp(userIp);
      return;
    }
    const fetchIp = async () => {
      try {
        const res = await fetch('/api/auth/ip');
        if (res.ok) {
          const data = (await res.json()) as { ip?: string };
          if (data && data.ip) {
            setDisplayIp(data.ip);
            return;
          }
        }
      } catch (e) {}

      // Fallback if local API is unreachable
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
          const data = (await res.json()) as { ip?: string };
          if (data && data.ip) {
            setDisplayIp(data.ip);
          }
        }
      } catch (e) {}
    };

    fetchIp();
  }, [userIp]);

  // Anti-Screenshot Protected Badge State
  const [showScreenshotBlockedBadge, setShowScreenshotBlockedBadge] = useState<boolean>(false);
  const screenshotBadgeTimerRef = useRef<any>(null);

  // Quality & HLS Levels
  const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string; height?: number }[]>([]);
  const [selectedQualityIndex, setSelectedQualityIndex] = useState<number>(-1); // -1 = Auto

  // Storyboard Scrubbing Preview
  const [storyboardCues, setStoryboardCues] = useState<StoryboardCue[]>([]);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [activeThumbnail, setActiveThumbnail] = useState<StoryboardCue | null>(null);

  // Skip Intro / Outro & Auto Skip
  const [autoSkip, setAutoSkip] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('tsettings');
        if (stored) return !!JSON.parse(stored).autoSkip;
      } catch (e) {}
    }
    return false;
  });
  const [showSkipIntroBtn, setShowSkipIntroBtn] = useState<boolean>(false);
  const [showSkipOutroBtn, setShowSkipOutroBtn] = useState<boolean>(false);
  const hasAutoSkippedIntroRef = useRef<boolean>(false);
  const hasAutoSkippedOutroRef = useRef<boolean>(false);

  // Auto Next Episode Countdown
  const [showNextEpModal, setShowNextEpModal] = useState<boolean>(false);
  const [nextEpCountdown, setNextEpCountdown] = useState<number>(5);
  const nextEpTimerRef = useRef<any>(null);

  // Subtitle System States
  const [subMode, setSubMode] = useState<'on' | 'bilingual' | 'off'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('txa_sub_mode') as any) || 'on';
    }
    return 'on';
  });
  const [primarySubIdx, setPrimarySubIdx] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const idx = localStorage.getItem('txa_sub_primary_idx');
      return idx ? parseInt(idx) : 0;
    }
    return 0;
  });
  const [secondarySubIdx, setSecondarySubIdx] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const idx = localStorage.getItem('txa_sub_secondary_idx');
      return idx ? parseInt(idx) : 1;
    }
    return 1;
  });

  const [tracks, setTracks] = useState<Subtitle[]>(subtitles);
  const [primaryCues, setPrimaryCues] = useState<SubtitleCue[]>([]);
  const [secondaryCues, setSecondaryCues] = useState<SubtitleCue[]>([]);
  const [activePrimaryCue, setActivePrimaryCue] = useState<SubtitleCue | null>(null);
  const [activeSecondaryCue, setActiveSecondaryCue] = useState<SubtitleCue | null>(null);
  const fetchedCuesCacheRef = useRef<Record<string, SubtitleCue[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subtitle Styling States
  const [primaryColor, setPrimaryColor] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_primary_color') || '#ffffff' : '#ffffff'));
  const [primarySize, setPrimarySize] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_primary_size') || '14pt' : '14pt'));
  const [primaryFont, setPrimaryFont] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_primary_font') || 'Arial' : 'Arial'));
  const [primaryBorder, setPrimaryBorder] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_primary_border') || 'Bóng đổ' : 'Bóng đổ'));
  const [primaryOpacity, setPrimaryOpacity] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_primary_opacity') || '100%' : '100%'));
  const [primaryBg, setPrimaryBg] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_primary_bg') || 'Không nền' : 'Không nền'));

  const [secondaryColor, setSecondaryColor] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_secondary_color') || '#ffeb3b' : '#ffeb3b'));
  const [secondarySize, setSecondarySize] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_secondary_size') || '14pt' : '14pt'));
  const [secondaryFont, setSecondaryFont] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_secondary_font') || 'Arial' : 'Arial'));
  const [secondaryBorder, setSecondaryBorder] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_secondary_border') || 'Bóng đổ' : 'Bóng đổ'));
  const [secondaryOpacity, setSecondaryOpacity] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_secondary_opacity') || '100%' : '100%'));
  const [secondaryBg, setSecondaryBg] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('txa_sub_secondary_bg') || 'Không nền' : 'Không nền'));

  // Audio Configuration & Web Audio API states
  const [aiVoiceover, setAiVoiceover] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('txa_voiceover_enabled') === 'true';
    }
    return false;
  });
  const [surround3D, setSurround3D] = useState<boolean>(false);
  const [eqVoiceBass, setEqVoiceBass] = useState<boolean>(false);
  const [volumeAmplifier, setVolumeAmplifier] = useState<number>(100); // 100% to 200%

  // Web Audio Context & Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const voiceFilterRef = useRef<BiquadFilterNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);

  // Menus & Dialogs
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [settingsView, setSettingsView] = useState<'main' | 'audio' | 'sub-hub' | 'sub-primary' | 'sub-secondary' | 'select-detail'>('main');
  const [activeDetailKey, setActiveDetailKey] = useState<string | null>(null);

  // Desktop Right-Click Context Menu & Stats
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const menuWidth = 230;
    const menuHeight = 330;

    const posX = clickX + menuWidth > rect.width ? Math.max(10, rect.width - menuWidth - 10) : clickX;
    const posY = clickY + menuHeight > rect.height ? Math.max(10, rect.height - menuHeight - 10) : clickY;

    setContextMenuPos({ x: posX, y: posY });
    if (activeMenu) setActiveMenu(null);
  };

  // Toast Notification
  const showNotice = useCallback((msg: string) => {
    setNoticeMessage(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setNoticeMessage(null);
    }, 2800);
  }, []);

  const triggerScreenshotBlocked = useCallback(() => {
    setShowScreenshotBlockedBadge(true);
    if (screenshotBadgeTimerRef.current) clearTimeout(screenshotBadgeTimerRef.current);
    screenshotBadgeTimerRef.current = setTimeout(() => {
      setShowScreenshotBlockedBadge(false);
    }, 3500);
  }, []);

  // Sync Subtitles prop changes
  useEffect(() => {
    setTracks(subtitles);
  }, [subtitles]);

  // Load Storyboard VTT
  useEffect(() => {
    if (!storyboardUrl) {
      setStoryboardCues([]);
      return;
    }
    const loadVtt = async () => {
      try {
        const proxied = proxySubtitleUrl(storyboardUrl);
        const res = await fetch(proxied);
        if (!res.ok) return;
        const text = (await res.text()).replace(/^\uFEFF/, '');
        const baseUrl = storyboardUrl.substring(0, storyboardUrl.lastIndexOf('/') + 1);

        const timeRegex = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/;
        const lines = text.split(/\r?\n/);
        const cues: StoryboardCue[] = [];
        let currentCue: { startTime: number; endTime: number } | null = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const match = line.match(timeRegex);
          if (match) {
            const startSec = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
            const endSec = parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]) + parseInt(match[8]) / 1000;
            currentCue = { startTime: startSec, endTime: endSec };
          } else if (currentCue && line.includes('#xywh=')) {
            const parts = line.split('#xywh=');
            const imgPath = parts[0] || '';
            const coords = (parts[1] || '').split(',').map(n => parseInt(n, 10));

            let fullImgUrl = imgPath;
            if (!imgPath.startsWith('http') && !imgPath.startsWith('/') && !imgPath.startsWith('data:')) {
              fullImgUrl = baseUrl + imgPath;
            }

            if (coords.length === 4) {
              cues.push({
                startTime: currentCue.startTime,
                endTime: currentCue.endTime,
                url: fullImgUrl,
                x: coords[0],
                y: coords[1],
                w: coords[2],
                h: coords[3]
              });
            }
            currentCue = null;
          }
        }
        setStoryboardCues(cues);
      } catch (err) {
        console.warn('Error loading storyboard:', err);
      }
    };
    loadVtt();
  }, [storyboardUrl]);

  // Load Subtitle Cues for Primary and Secondary Tracks
  useEffect(() => {
    const loadTrackCues = async (track: Subtitle | undefined, setCues: (c: SubtitleCue[]) => void) => {
      if (!track) {
        setCues([]);
        return;
      }
      if (track.cues && track.cues.length > 0) {
        setCues(track.cues);
        return;
      }
      if (fetchedCuesCacheRef.current[track.file]) {
        setCues(fetchedCuesCacheRef.current[track.file]);
        return;
      }
      try {
        const proxied = proxySubtitleUrl(track.file);
        const res = await fetch(proxied);
        if (res.ok) {
          const text = await res.text();
          const parsed = parseSubtitles(text);
          fetchedCuesCacheRef.current[track.file] = parsed;
          setCues(parsed);
        }
      } catch (e) {
        console.error('Error fetching subtitles:', e);
      }
    };

    const pTrack = tracks[primarySubIdx];
    const sTrack = tracks[secondarySubIdx];
    loadTrackCues(pTrack, setPrimaryCues);
    loadTrackCues(sTrack, setSecondaryCues);
  }, [tracks, primarySubIdx, secondarySubIdx]);

  // Sync Active Subtitle Cues with playback time
  useEffect(() => {
    if (subMode !== 'off' && primaryCues.length > 0) {
      const cue = primaryCues.find(c => currentPlaybackTime >= c.startTime && currentPlaybackTime <= c.endTime);
      setActivePrimaryCue(cue || null);
    } else {
      setActivePrimaryCue(null);
    }

    if (subMode === 'bilingual' && secondaryCues.length > 0) {
      const cue = secondaryCues.find(c => currentPlaybackTime >= c.startTime && currentPlaybackTime <= c.endTime);
      setActiveSecondaryCue(cue || null);
    } else {
      setActiveSecondaryCue(null);
    }
  }, [currentPlaybackTime, primaryCues, secondaryCues, subMode]);

  // Vietnamese AI Voiceover Reader
  const lastSpokenCueIdRef = useRef<string | null>(null);
  const hasSpokenIntroRef = useRef<boolean>(false);

  useEffect(() => {
    if (!aiVoiceover || subMode === 'off') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    let targetCue: SubtitleCue | null = null;
    const isViText = (str: string) => /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(str);

    if (activePrimaryCue && activePrimaryCue.text && isViText(activePrimaryCue.text)) {
      targetCue = activePrimaryCue;
    } else if (activeSecondaryCue && activeSecondaryCue.text && isViText(activeSecondaryCue.text)) {
      targetCue = activeSecondaryCue;
    } else if (activePrimaryCue && activePrimaryCue.text) {
      targetCue = activePrimaryCue;
    }

    if (!targetCue || !targetCue.text) return;

    const cueId = targetCue.id || `${targetCue.startTime}-${targetCue.text}`;
    if (lastSpokenCueIdRef.current === cueId) return;
    lastSpokenCueIdRef.current = cueId;

    const synth = window.speechSynthesis;
    synth.cancel();

    const cleanText = targetCue.text.replace(/<[^>]*>/g, '').replace(/[\r\n]+/g, ' ').trim();
    if (!cleanText) return;

    let textToSpeak = cleanText;
    if (!hasSpokenIntroRef.current) {
      hasSpokenIntroRef.current = true;
      textToSpeak = `Bản quyền thuyết minh bởi T X A. ${cleanText}`;
    }

    const utter = new SpeechSynthesisUtterance(textToSpeak);
    utter.lang = 'vi-VN';
    utter.rate = 1.1;

    const voices = synth.getVoices();
    const bestVoice =
      voices.find(v => v.lang.includes('vi') && (v.name.includes('HoaiMy') || v.name.includes('NamMinh'))) ||
      voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    if (bestVoice) utter.voice = bestVoice;

    synth.speak(utter);
  }, [activePrimaryCue, activeSecondaryCue, aiVoiceover, subMode]);

  // Web Audio API Setup
  const initAudioNodes = useCallback(() => {
    const video = videoRef.current;
    if (!video || audioCtxRef.current) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const audioCtx = new AudioCtxClass();
      const source = audioCtx.createMediaElementSource(video);

      // Gain Node for Volume Amplification (up to 200%)
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = volumeAmplifier / 100;

      // Bass EQ Filter (Lowshelf boost at 120Hz)
      const bassFilter = audioCtx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 120;
      bassFilter.gain.value = eqVoiceBass ? 6 : 0;

      // Voice EQ Filter (Peaking boost at 3000Hz for dialogue clarity)
      const voiceFilter = audioCtx.createBiquadFilter();
      voiceFilter.type = 'peaking';
      voiceFilter.frequency.value = 3000;
      voiceFilter.Q.value = 1.2;
      voiceFilter.gain.value = eqVoiceBass ? 4.5 : 0;

      // Stereo / 3D Surround Panner
      let panner: StereoPannerNode | null = null;
      if (audioCtx.createStereoPanner) {
        panner = audioCtx.createStereoPanner();
        panner.pan.value = surround3D ? 0.2 : 0;
      }

      // Connect graph: Source -> Bass -> Voice -> (Panner) -> Gain -> Destination
      if (panner) {
        source.connect(bassFilter);
        bassFilter.connect(voiceFilter);
        voiceFilter.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      } else {
        source.connect(bassFilter);
        bassFilter.connect(voiceFilter);
        voiceFilter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      }

      audioCtxRef.current = audioCtx;
      mediaSourceNodeRef.current = source;
      gainNodeRef.current = gainNode;
      bassFilterRef.current = bassFilter;
      voiceFilterRef.current = voiceFilter;
      pannerNodeRef.current = panner;
    } catch (e) {
      console.warn('Web Audio API init error (ignoring if cross-origin):', e);
    }
  }, [volumeAmplifier, eqVoiceBass, surround3D]);

  // Update Audio Nodes when settings change
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volumeAmplifier / 100;
    }
    if (bassFilterRef.current && voiceFilterRef.current) {
      bassFilterRef.current.gain.value = eqVoiceBass ? 6 : 0;
      voiceFilterRef.current.gain.value = eqVoiceBass ? 4.5 : 0;
    }
    if (pannerNodeRef.current) {
      pannerNodeRef.current.pan.value = surround3D ? 0.2 : 0;
    }
  }, [volumeAmplifier, eqVoiceBass, surround3D]);

  // Initialize HLS / Video Stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let realUrl = url;
    if (realUrl.includes('player.phimapi.com/player/?url=')) {
      try {
        const urlObj = new URL(realUrl);
        const streamParam = urlObj.searchParams.get('url');
        if (streamParam) realUrl = decodeURIComponent(streamParam);
      } catch (e) {}
    }
    if (realUrl.includes('webfilm.txasoftdev.workers.dev/txa_media/')) {
      realUrl = realUrl.replace('https://webfilm.txasoftdev.workers.dev/txa_media/', 'https://pub-23023fab408a4b7aa2786bfde1d472d9.r2.dev/txa_media/');
    }

    const isM3u8 = realUrl.includes('.m3u8') || realUrl.includes('stream');

    const setupHls = (HlsClass: any) => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (isM3u8 && HlsClass && HlsClass.isSupported()) {
        const hls = new HlsClass({
          enableWorker: true,
          maxBufferLength: 120,
          maxMaxBufferLength: 300,
          maxBufferSize: 150 * 1024 * 1024,
          progressive: true,
          backBufferLength: 30,
        });

        hls.loadSource(realUrl);
        hls.attachMedia(video);

        hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
          let maxAllowedHeight = 99999;
          if (maxResolution === 'SD') maxAllowedHeight = 480;
          else if (maxResolution === 'HD') maxAllowedHeight = 720;
          else if (maxResolution === 'FHD') maxAllowedHeight = 1080;

          const levels = hls.levels || [];
          const parsedLevels = [
            { index: -1, label: 'Auto' },
            ...levels
              .map((l: any, idx: number) => ({
                index: idx,
                label: l.height ? `${l.height}p` : `Chất lượng ${idx + 1}`,
                height: l.height
              }))
              .filter((l: any) => !l.height || l.height <= maxAllowedHeight)
              .reverse()
          ];
          setHlsLevels(parsedLevels);

          if (currentTime > 0) {
            video.currentTime = currentTime;
          }

          if (isAutoPlay) {
            video.play().catch(() => {});
          }
        });

        hls.on(HlsClass.Events.ERROR, (_evt: any, data: any) => {
          if (data.fatal) {
            if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = realUrl;
        if (currentTime > 0) video.currentTime = currentTime;
        if (isAutoPlay) video.play().catch(() => {});
      } else {
        video.src = realUrl;
        if (currentTime > 0) video.currentTime = currentTime;
        if (isAutoPlay) video.play().catch(() => {});
      }
    };

    const loadHlsLibrary = () => {
      if ((window as any).Hls) {
        setupHls((window as any).Hls);
      } else {
        let script = document.querySelector('script[src*="hls.min.js"]') as HTMLScriptElement;
        if (!script) {
          script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.8/hls.min.js';
          script.async = true;
          document.head.appendChild(script);
        }
        const onScriptLoad = () => {
          if ((window as any).Hls) setupHls((window as any).Hls);
        };
        script.addEventListener('load', onScriptLoad);
      }
    };

    loadHlsLibrary();

    if (onPlayerReady) {
      onPlayerReady(() => videoRef.current?.currentTime || 0);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, isAutoPlay, maxResolution]);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const cur = video.currentTime;
    const dur = video.duration || 0;
    setCurrentPlaybackTime(cur);
    setDuration(dur);

    // Buffer calculation
    if (video.buffered.length > 0 && dur > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBufferedPercent(Math.min(100, (bufferedEnd / dur) * 100));
    }

    // Skip Intro Check
    if (timeIntroEnd > 0 && timeIntroEnd > timeIntroStart) {
      if (cur >= timeIntroStart && cur < timeIntroEnd) {
        if (autoSkip && !hasAutoSkippedIntroRef.current) {
          hasAutoSkippedIntroRef.current = true;
          video.currentTime = timeIntroEnd;
          showNotice('Đã tự động bỏ qua Intro');
          setShowSkipIntroBtn(false);
        } else if (!autoSkip) {
          setShowSkipIntroBtn(true);
        }
      } else {
        setShowSkipIntroBtn(false);
      }
    }

    // Skip Outro & Auto Next Check
    if (timeOutroStart > 0 && dur > 0 && timeOutroStart < dur) {
      if (cur >= timeOutroStart && cur < dur - 1) {
        if (autoSkip && !hasAutoSkippedOutroRef.current) {
          hasAutoSkippedOutroRef.current = true;
          video.currentTime = dur;
          showNotice('Đã tự động bỏ qua Outro');
          setShowSkipOutroBtn(false);
        } else if (!autoSkip) {
          setShowSkipOutroBtn(true);
        }

        // Auto Next Episode Countdown
        if (autoNextEpisode && nextEpisode && !showNextEpModal && !hasAutoSkippedOutroRef.current) {
          setShowNextEpModal(true);
          setNextEpCountdown(5);
          if (nextEpTimerRef.current) clearInterval(nextEpTimerRef.current);
          nextEpTimerRef.current = setInterval(() => {
            setNextEpCountdown(prev => {
              if (prev <= 1) {
                if (nextEpTimerRef.current) clearInterval(nextEpTimerRef.current);
                if (onNextEpisode) onNextEpisode();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        setShowSkipOutroBtn(false);
      }
    }

    if (onTimeUpdate) {
      onTimeUpdate(cur, dur);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    initAudioNodes();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
    if (autoNextEpisode && onNextEpisode) {
      onNextEpisode();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, newTime));
    setCurrentPlaybackTime(video.currentTime);
  };

  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    video.volume = clamped;
    setVolume(clamped);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('txa_player_volume', String(clamped));
    }
    if (clamped > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('txa_player_muted', 'false');
      }
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('txa_player_muted', String(video.muted));
    }
  };

  const handleRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('txa_player_playback_rate', String(rate));
    }
    showNotice(`Tốc độ: ${rate}x`);
    setActiveMenu(null);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP failed:', e);
    }
  };

  // Activity & Controls Auto-hide
  const resetControlsTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        if (!activeMenu) {
          setIsControlsVisible(false);
        }
      }, 3500);
    }
  }, [isPlaying, activeMenu]);

  useEffect(() => {
    const onMouseMove = () => resetControlsTimer();
    const onTouchStart = () => resetControlsTimer();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchstart', onTouchStart);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchStart);
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [resetControlsTimer]);

  // Close popups and context menu when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.closest &&
        (target.closest('.txa-popup-container') || target.closest('.txa-context-menu') || target.closest('.txa-menu-toggle-btn'))
      ) {
        return;
      }
      setActiveMenu(null);
      setContextMenuPos(null);
    };

    if (activeMenu || contextMenuPos) {
      window.addEventListener('click', handleGlobalClick);
      window.addEventListener('contextmenu', handleGlobalClick);
      window.addEventListener('touchstart', handleGlobalClick);
    }
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('contextmenu', handleGlobalClick);
      window.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [activeMenu, contextMenuPos]);

  // Comprehensive Desktop Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Detect Screen Capture / Download Shortcuts
      if (
        e.key === 'PrintScreen' ||
        ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotBlocked();
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }
      const key = e.key.toLowerCase();
      const video = videoRef.current;
      if (!video) return;

      // Play / Pause
      if (e.code === 'Space' || key === 'k') {
        e.preventDefault();
        togglePlay();
      }
      // Rewind 10s
      else if (e.code === 'ArrowLeft' || key === 'j') {
        e.preventDefault();
        handleSeek(video.currentTime - 10);
        showNotice('Lùi 10s ⏪');
      }
      // Forward 10s
      else if (e.code === 'ArrowRight' || key === 'l') {
        e.preventDefault();
        handleSeek(video.currentTime + 10);
        showNotice('Tua 10s ⏩');
      }
      // Volume Up
      else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const newV = Math.min(1, volume + 0.1);
        handleVolumeChange(newV);
        showNotice(`Âm lượng: ${Math.round(newV * 100)}%`);
      }
      // Volume Down
      else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const newV = Math.max(0, volume - 0.1);
        handleVolumeChange(newV);
        showNotice(`Âm lượng: ${Math.round(newV * 100)}%`);
      }
      // Mute / Unmute
      else if (key === 'm') {
        e.preventDefault();
        toggleMute();
      }
      // Fullscreen
      else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Toggle Subtitles (C)
      else if (key === 'c' && tracks.length > 0) {
        e.preventDefault();
        const nextMode = subMode === 'off' ? 'on' : subMode === 'on' ? 'bilingual' : 'off';
        setSubMode(nextMode);
        localStorage.setItem('txa_sub_mode', nextMode);
        showNotice(`Phụ đề: ${nextMode === 'on' ? 'Bật' : nextMode === 'bilingual' ? 'Song ngữ' : 'Tắt'}`);
      }
      // Toggle AI Voiceover (V)
      else if (key === 'v') {
        e.preventDefault();
        const nextVal = !aiVoiceover;
        setAiVoiceover(nextVal);
        localStorage.setItem('txa_voiceover_enabled', String(nextVal));
        showNotice(`Thuyết minh AI: ${nextVal ? 'Bật' : 'Tắt'}`);
      }
      // Settings (S)
      else if (key === 's') {
        e.preventDefault();
        setActiveMenu(prev => (prev === 'settings' ? null : 'settings'));
        setSettingsView('main');
      }
      // Next Episode (Shift + N)
      else if (e.shiftKey && key === 'n' && onNextEpisode) {
        e.preventDefault();
        onNextEpisode();
      }
      // Prev Episode (Shift + P)
      else if (e.shiftKey && key === 'p' && onPrevEpisode) {
        e.preventDefault();
        onPrevEpisode();
      }
      // Jump to % with number keys (0 - 9)
      else if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.key >= '0' && e.key <= '9') {
        const percent = parseInt(e.key, 10) * 0.1;
        if (duration > 0) {
          e.preventDefault();
          handleSeek(duration * percent);
          showNotice(`Chuyển tới: ${parseInt(e.key, 10) * 10}%`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [volume, duration, subMode, tracks, aiVoiceover, onNextEpisode, onPrevEpisode, triggerScreenshotBlocked]);

  // Storyboard Seekbar Hover Calculation
  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = offsetX / rect.width;
    const timeAtHover = percentage * duration;

    setHoverPosition(offsetX);
    setHoverTime(timeAtHover);

    if (storyboardCues.length > 0) {
      const matched = storyboardCues.find(c => timeAtHover >= c.startTime && timeAtHover <= c.endTime);
      setActiveThumbnail(matched || null);
    }
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
    setActiveThumbnail(null);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = offsetX / rect.width;
    handleSeek(percentage * duration);
  };

  // Subtitle Styling Helper
  const getSubStyle = (isPrimary: boolean): React.CSSProperties => {
    const color = isPrimary ? primaryColor : secondaryColor;
    const size = isPrimary ? primarySize : secondarySize;
    const opacityVal = isPrimary ? primaryOpacity : secondaryOpacity;
    const font = isPrimary ? primaryFont : secondaryFont;
    const borderVal = isPrimary ? primaryBorder : secondaryBorder;
    const bgVal = isPrimary ? primaryBg : secondaryBg;

    let textShadow = 'none';
    if (borderVal === 'Bóng đổ') {
      textShadow = '0 2px 5px rgba(0, 0, 0, 0.95), 0 0 2px #000';
    } else if (borderVal === 'Viền mỏng') {
      textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
    } else if (borderVal === 'Viền dày') {
      textShadow = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 8px rgba(0,0,0,0.8)';
    }

    let background = 'transparent';
    let padding = '0px';
    let borderRadius = '0px';

    if (bgVal !== 'Không nền') {
      if (bgVal.includes('Đen 100%')) background = 'rgba(0, 0, 0, 1)';
      else if (bgVal.includes('Đen 75%')) background = 'rgba(0, 0, 0, 0.75)';
      else if (bgVal.includes('Đen 50%') || bgVal === 'Đen') background = 'rgba(0, 0, 0, 0.5)';
      else if (bgVal.includes('Xám')) background = 'rgba(80, 80, 80, 0.6)';
      else if (bgVal.includes('Đỏ')) background = 'rgba(220, 38, 38, 0.6)';
      else if (bgVal.includes('Xanh')) background = 'rgba(37, 99, 235, 0.6)';
      padding = '4px 10px';
      borderRadius = '6px';
    }

    const op = parseFloat(opacityVal) / 100;
    const fontFamily = font === 'Sans-Serif' ? 'sans-serif' : `'${font}', sans-serif`;

    return {
      color,
      fontSize: size,
      opacity: op,
      fontFamily,
      textShadow,
      background,
      padding,
      borderRadius,
      margin: '3px 0',
      lineHeight: 1.4,
      whiteSpace: 'pre-wrap',
      display: 'inline-block',
      textAlign: 'center',
      fontWeight: isPrimary ? 500 : 600,
      userSelect: 'none',
      pointerEvents: 'none'
    };
  };

  // Subtitle File Upload
  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (text) {
        const parsed = parseSubtitles(text);
        if (parsed.length > 0) {
          const newTrack: Subtitle = {
            label: file.name.replace(/\.[^/.]+$/, '').substring(0, 18) || 'Phụ đề ngoài',
            file: `uploaded-${Date.now()}`,
            cues: parsed
          };
          setTracks(prev => [...prev, newTrack]);
          setPrimarySubIdx(tracks.length);
          if (subMode === 'off') setSubMode('on');
          showNotice(`Đã tải: ${file.name}`);
        } else {
          alert('Không thể nhận diện cấu trúc file phụ đề (hỗ trợ .srt hoặc .vtt)');
        }
      }
    };
    reader.readAsText(file);
  };

  // Settings Configuration Definitions for Menus
  const detailSettingsConfig: Record<string, { title: string; options: { label: string; value: string }[]; current: string; onChange: (val: string) => void }> = {
    'primary-color': {
      title: 'Màu sắc phụ đề chính',
      current: primaryColor,
      options: [
        { label: 'Trắng', value: '#ffffff' },
        { label: 'Vàng', value: '#ffeb3b' },
        { label: 'Xanh lá', value: '#4caf50' },
        { label: 'Xanh dương', value: '#2196f3' },
        { label: 'Đỏ', value: '#f44336' }
      ],
      onChange: val => {
        setPrimaryColor(val);
        localStorage.setItem('txa_sub_primary_color', val);
      }
    },
    'primary-size': {
      title: 'Cỡ chữ phụ đề chính',
      current: primarySize,
      options: [
        { label: '10pt', value: '10pt' },
        { label: '12pt', value: '12pt' },
        { label: '14pt', value: '14pt' },
        { label: '16pt', value: '16pt' },
        { label: '18pt', value: '18pt' },
        { label: '20pt', value: '20pt' },
        { label: '24pt', value: '24pt' }
      ],
      onChange: val => {
        setPrimarySize(val);
        localStorage.setItem('txa_sub_primary_size', val);
      }
    },
    'primary-font': {
      title: 'Font chữ phụ đề chính',
      current: primaryFont,
      options: [
        { label: 'Arial', value: 'Arial' },
        { label: 'Outfit', value: 'Outfit' },
        { label: 'Inter', value: 'Inter' },
        { label: 'Roboto', value: 'Roboto' },
        { label: 'PhimMoi', value: 'PhimMoi' },
        { label: 'Sans-Serif', value: 'Sans-Serif' }
      ],
      onChange: val => {
        setPrimaryFont(val);
        localStorage.setItem('txa_sub_primary_font', val);
      }
    },
    'primary-border': {
      title: 'Bóng viền phụ đề chính',
      current: primaryBorder,
      options: [
        { label: 'Không viền', value: 'Không viền' },
        { label: 'Bóng đổ', value: 'Bóng đổ' },
        { label: 'Viền mỏng', value: 'Viền mỏng' },
        { label: 'Viền dày', value: 'Viền dày' }
      ],
      onChange: val => {
        setPrimaryBorder(val);
        localStorage.setItem('txa_sub_primary_border', val);
      }
    },
    'primary-opacity': {
      title: 'Độ mờ chữ phụ đề chính',
      current: primaryOpacity,
      options: [
        { label: '100%', value: '100%' },
        { label: '75%', value: '75%' },
        { label: '50%', value: '50%' },
        { label: '25%', value: '25%' }
      ],
      onChange: val => {
        setPrimaryOpacity(val);
        localStorage.setItem('txa_sub_primary_opacity', val);
      }
    },
    'primary-bg': {
      title: 'Nền phụ đề chính',
      current: primaryBg,
      options: [
        { label: 'Không nền', value: 'Không nền' },
        { label: 'Đen 50%', value: 'Đen 50%' },
        { label: 'Đen 75%', value: 'Đen 75%' },
        { label: 'Đen 100%', value: 'Đen 100%' },
        { label: 'Xám 50%', value: 'Xám 50%' }
      ],
      onChange: val => {
        setPrimaryBg(val);
        localStorage.setItem('txa_sub_primary_bg', val);
      }
    },
    'secondary-color': {
      title: 'Màu sắc phụ đề phụ',
      current: secondaryColor,
      options: [
        { label: 'Trắng', value: '#ffffff' },
        { label: 'Vàng', value: '#ffeb3b' },
        { label: 'Xanh lá', value: '#4caf50' },
        { label: 'Xanh dương', value: '#2196f3' },
        { label: 'Đỏ', value: '#f44336' }
      ],
      onChange: val => {
        setSecondaryColor(val);
        localStorage.setItem('txa_sub_secondary_color', val);
      }
    },
    'secondary-size': {
      title: 'Cỡ chữ phụ đề phụ',
      current: secondarySize,
      options: [
        { label: '10pt', value: '10pt' },
        { label: '12pt', value: '12pt' },
        { label: '14pt', value: '14pt' },
        { label: '16pt', value: '16pt' },
        { label: '18pt', value: '18pt' },
        { label: '20pt', value: '20pt' }
      ],
      onChange: val => {
        setSecondarySize(val);
        localStorage.setItem('txa_sub_secondary_size', val);
      }
    },
    'secondary-font': {
      title: 'Font chữ phụ đề phụ',
      current: secondaryFont,
      options: [
        { label: 'Arial', value: 'Arial' },
        { label: 'Outfit', value: 'Outfit' },
        { label: 'Inter', value: 'Inter' },
        { label: 'Roboto', value: 'Roboto' },
        { label: 'PhimMoi', value: 'PhimMoi' },
        { label: 'Sans-Serif', value: 'Sans-Serif' }
      ],
      onChange: val => {
        setSecondaryFont(val);
        localStorage.setItem('txa_sub_secondary_font', val);
      }
    },
    'secondary-border': {
      title: 'Bóng viền phụ đề phụ',
      current: secondaryBorder,
      options: [
        { label: 'Không viền', value: 'Không viền' },
        { label: 'Bóng đổ', value: 'Bóng đổ' },
        { label: 'Viền mỏng', value: 'Viền mỏng' },
        { label: 'Viền dày', value: 'Viền dày' }
      ],
      onChange: val => {
        setSecondaryBorder(val);
        localStorage.setItem('txa_sub_secondary_border', val);
      }
    },
    'secondary-opacity': {
      title: 'Độ mờ chữ phụ đề phụ',
      current: secondaryOpacity,
      options: [
        { label: '100%', value: '100%' },
        { label: '75%', value: '75%' },
        { label: '50%', value: '50%' },
        { label: '25%', value: '25%' }
      ],
      onChange: val => {
        setSecondaryOpacity(val);
        localStorage.setItem('txa_sub_secondary_opacity', val);
      }
    },
    'secondary-bg': {
      title: 'Nền phụ đề phụ',
      current: secondaryBg,
      options: [
        { label: 'Không nền', value: 'Không nền' },
        { label: 'Đen 50%', value: 'Đen 50%' },
        { label: 'Đen 75%', value: 'Đen 75%' },
        { label: 'Đen 100%', value: 'Đen 100%' },
        { label: 'Xám 50%', value: 'Xám 50%' }
      ],
      onChange: val => {
        setSecondaryBg(val);
        localStorage.setItem('txa_sub_secondary_bg', val);
      }
    }
  };

  const getDisplayColorLabel = (hex: string) => {
    if (hex === '#ffffff') return 'Trắng';
    if (hex === '#ffeb3b') return 'Vàng';
    if (hex === '#4caf50') return 'Xanh lá';
    if (hex === '#2196f3') return 'Xanh dương';
    if (hex === '#f44336') return 'Đỏ';
    return hex;
  };

  return (
    <div
      ref={containerRef}
      className={`txa-player-root relative w-full h-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl select-none font-outfit ${className}`}
      style={{ minHeight: '220px' }}
      onMouseMove={resetControlsTimer}
      onContextMenu={handleContextMenu}
      onClick={() => {
        if (activeMenu) setActiveMenu(null);
        if (contextMenuPos) setContextMenuPos(null);
      }}
    >
      <style>{`
        @keyframes floatWatermark {
          0% { top: 8%; left: 5%; }
          25% { top: 75%; left: 30%; }
          50% { top: 35%; left: 75%; }
          75% { top: 80%; left: 60%; }
          100% { top: 12%; left: 80%; }
        }
        .txa-custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .txa-custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
      `}</style>

      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onClick={e => {
          e.stopPropagation();
          if (activeMenu || contextMenuPos) {
            setActiveMenu(null);
            setContextMenuPos(null);
            return;
          }
          togglePlay();
        }}
        onDoubleClick={e => {
          e.stopPropagation();
          toggleFullscreen();
        }}
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-12 h-12 rounded-full border-3 border-white/20 border-t-[#7c3aed] animate-spin"></div>
        </div>
      )}

      {/* Floating Notice Toast */}
      {noticeMessage && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-white/15 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-2xl z-40 animate-fade-in pointer-events-none">
          {noticeMessage}
        </div>
      )}

      {/* Anti-Screenshot Protected Notification Badge (Image 1) */}
      {showScreenshotBlockedBadge && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-bounce">
          <div className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-5 py-2.5 rounded-2xl text-xs md:text-sm font-bold shadow-[0_10px_35px_rgba(2,132,199,0.6)] border border-white/25 flex items-center gap-2 tracking-tight">
            <span>Chụp màn hình đã bị chặn để bảo vệ bản quyền!</span>
            <span>🔒</span>
          </div>
        </div>
      )}

      {/* Upper-Left IP Watermark (Image 1) */}
      {!hideWatermark && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none text-[11px] font-medium text-white/35 select-none font-sans tracking-wide">
          {siteName} | IP: {displayIp || '...'}
        </div>
      )}

      {/* Upper-Right Logo Watermark */}
      {!hideWatermark && (
        <>
          <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center bg-black/50 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-white/10 shadow-xl">
            <img src="/logo-icon.gif" alt="TXA" className="h-5 w-auto object-contain" />
          </div>
        </>
      )}

      {/* Render Subtitles Overlay */}
      <div className="absolute left-1/2 -translate-x-1/2 w-[88%] text-center pointer-events-none z-30 flex flex-col items-center justify-end transition-all duration-300"
        style={{ bottom: isControlsVisible ? '80px' : '28px' }}
      >
        {subMode === 'bilingual' && activeSecondaryCue && (
          <div style={getSubStyle(false)}>
            {activeSecondaryCue.text.replace(/<[^>]*>/g, '')}
          </div>
        )}
        {subMode !== 'off' && activePrimaryCue && (
          <div style={getSubStyle(true)}>
            {activePrimaryCue.text.replace(/<[^>]*>/g, '')}
          </div>
        )}
      </div>

      {/* Skip Intro Floating Button */}
      {showSkipIntroBtn && timeIntroEnd > 0 && (
        <button
          onClick={e => {
            e.stopPropagation();
            handleSeek(timeIntroEnd);
            setShowSkipIntroBtn(false);
            showNotice('Đã bỏ qua đoạn giới thiệu (Intro)');
          }}
          data-txatooltip="Bỏ qua giới thiệu"
          className="absolute z-30 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#7c3aed]/90 hover:bg-[#8b5cf6] text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-2xl backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95"
          style={{ bottom: isControlsVisible ? '84px' : '32px', right: '16px' }}
        >
          <span className="material-symbols-outlined text-[16px]">skip_next</span>
          <span>Bỏ qua giới thiệu</span>
        </button>
      )}

      {/* Skip Outro Floating Button */}
      {showSkipOutroBtn && duration > 0 && (
        <button
          onClick={e => {
            e.stopPropagation();
            handleSeek(duration);
            setShowSkipOutroBtn(false);
            showNotice('Đã bỏ qua đoạn kết (Outro)');
          }}
          data-txatooltip="Bỏ qua đoạn kết"
          className="absolute z-30 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#7c3aed]/90 hover:bg-[#8b5cf6] text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-2xl backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95"
          style={{ bottom: isControlsVisible ? '84px' : '32px', right: '16px' }}
        >
          <span className="material-symbols-outlined text-[16px]">skip_next</span>
          <span>Bỏ qua Outro</span>
        </button>
      )}

      {/* Next Episode Countdown Popup */}
      {showNextEpModal && nextEpisode && (
        <div
          className="absolute z-40 bottom-16 sm:bottom-20 right-3 sm:right-6 bg-[#0f0f14]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl w-[320px] max-w-[calc(100vw-24px)] pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex gap-3">
            <div className="relative w-16 h-22 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800 shadow">
              <img src={nextEpisode.thumbnail} alt={nextEpisode.episodeName} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h4 className="text-white text-xs font-bold truncate">{nextEpisode.title}</h4>
                <p className="text-zinc-400 text-[10px] truncate mt-0.5">{nextEpisode.episodeName}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-zinc-500 text-[10px]">Tự động sau</span>
                  <span className="text-white text-lg font-black">{nextEpCountdown}s</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      if (nextEpTimerRef.current) clearInterval(nextEpTimerRef.current);
                      setShowNextEpModal(false);
                      if (onNextEpisode) onNextEpisode();
                    }}
                    data-txatooltip="Chuyển ngay tập tiếp theo"
                    className="flex-1 bg-[#7c3aed] hover:bg-[#8b5cf6] text-white text-[10px] font-bold py-1.5 px-2 rounded-lg cursor-pointer border-none"
                  >
                    Chuyển ngay
                  </button>
                  <button
                    onClick={() => {
                      if (nextEpTimerRef.current) clearInterval(nextEpTimerRef.current);
                      setShowNextEpModal(false);
                    }}
                    data-txatooltip="Bỏ qua tự động chuyển tập"
                    className="flex-1 bg-white/10 hover:bg-white/15 text-zinc-300 text-[10px] font-bold py-1.5 px-2 rounded-lg cursor-pointer border-none"
                  >
                    Bỏ qua
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Subtitle File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".srt,.vtt"
        onChange={handleSubtitleUpload}
      />

      {/* ========================================================
          POPUP 1: SUBTITLE SELECTOR (Image 4 in specs)
          ======================================================== */}
      {activeMenu === 'subtitles' && (
        <div
          className="txa-popup-container absolute z-50 bottom-16 sm:bottom-18 right-3 sm:right-6 bg-[#0f0f14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl w-[360px] max-w-[calc(100vw-24px)] text-white"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold tracking-tight">Phụ đề</span>
            <div className="flex items-center gap-2">
              {/* Segmented Mode Pills: Bật | Song ngữ | Tắt */}
              <div className="flex bg-white/10 rounded-full p-0.5">
                {(['on', 'bilingual', 'off'] as const).map(m => {
                  const label = m === 'on' ? 'Bật' : m === 'bilingual' ? 'Song ngữ' : 'Tắt';
                  const isActive = subMode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setSubMode(m);
                        localStorage.setItem('txa_sub_mode', m);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all border-none ${
                        isActive ? 'bg-white text-black font-bold shadow' : 'bg-transparent text-white/70 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Upload Subtitle Button */}
              <TxaTooltip title="Tải phụ đề từ máy" shortcut=".srt / .vtt">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer border-none text-white transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                </button>
              </TxaTooltip>
            </div>
          </div>

          {/* Body: Two Cards for Primary and Secondary Tracks */}
          {subMode !== 'off' ? (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {/* Primary Tracks */}
              <div className="bg-black/35 rounded-xl p-2.5 border border-white/5">
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-2">PHỤ ĐỀ CHÍNH</div>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto txa-custom-scroll">
                  {tracks.map((t, idx) => {
                    const isSelected = primarySubIdx === idx;
                    return (
                      <div
                        key={t.file + idx}
                        onClick={() => {
                          setPrimarySubIdx(idx);
                          localStorage.setItem('txa_sub_primary_idx', String(idx));
                          if (secondarySubIdx === idx) {
                            const nextSec = tracks.findIndex((_, i) => i !== idx);
                            if (nextSec !== -1) {
                              setSecondarySubIdx(nextSec);
                              localStorage.setItem('txa_sub_secondary_idx', String(nextSec));
                            }
                          }
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                          isSelected ? 'bg-white/10 font-bold text-[#ffeb3b]' : 'text-white/80 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{t.label}</span>
                        {isSelected && <span className="material-symbols-outlined text-[14px] text-[#ffeb3b]">check</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Tracks (Song ngữ) */}
              <div className={`bg-black/35 rounded-xl p-2.5 border border-white/5 transition-opacity ${subMode === 'bilingual' ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-2">PHỤ ĐỀ PHỤ</div>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto txa-custom-scroll">
                  {tracks.map((t, idx) => {
                    if (idx === primarySubIdx) return null;
                    const isSelected = secondarySubIdx === idx;
                    return (
                      <div
                        key={t.file + idx}
                        onClick={() => {
                          setSecondarySubIdx(idx);
                          localStorage.setItem('txa_sub_secondary_idx', String(idx));
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                          isSelected ? 'bg-white/10 font-bold text-[#ffeb3b]' : 'text-white/80 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{t.label}</span>
                        {isSelected && <span className="material-symbols-outlined text-[14px] text-[#ffeb3b]">check</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-white/40">
              Phụ đề đang tắt. Chọn <b>Bật</b> hoặc <b>Song ngữ</b> để hiển thị.
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          POPUP 2: SETTINGS & SUBMENUS (Images 1, 2, 3, 5)
          ======================================================== */}
      {activeMenu === 'settings' && (
        <div
          className="txa-popup-container absolute z-50 bottom-16 sm:bottom-18 right-3 sm:right-6 bg-[#0f0f14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl w-[320px] max-w-[calc(100vw-24px)] text-white text-xs font-sans"
          onClick={e => e.stopPropagation()}
        >
          {/* VIEW 1: MAIN SETTINGS MENU (Image 3) */}
          {settingsView === 'main' && (
            <div className="flex flex-col gap-1">
              {/* Tốc độ phát */}
              <div
                onClick={() => {
                  const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
                  const curIdx = rates.indexOf(playbackRate);
                  const nextRate = rates[(curIdx + 1) % rates.length];
                  handleRateChange(nextRate);
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Tốc độ phát</span>
                <span className="text-white/60 font-semibold">{playbackRate}x</span>
              </div>

              {/* Cấu hình âm thanh > */}
              <div
                onClick={() => setSettingsView('audio')}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Cấu hình âm thanh</span>
                <span className="material-symbols-outlined text-white/50 text-[18px]">chevron_right</span>
              </div>

              {/* Tùy chỉnh phụ đề > (nếu có phụ đề) */}
              {tracks.length > 0 && (
                <div
                  onClick={() => setSettingsView('sub-hub')}
                  className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
                >
                  <span className="text-white/90">Tùy chỉnh phụ đề</span>
                  <span className="material-symbols-outlined text-white/50 text-[18px]">chevron_right</span>
                </div>
              )}

              {/* Thuyết minh AI (by TXA) */}
              <div
                onClick={() => {
                  const nextVal = !aiVoiceover;
                  setAiVoiceover(nextVal);
                  localStorage.setItem('txa_voiceover_enabled', String(nextVal));
                  showNotice(`Thuyết minh AI: ${nextVal ? 'Bật' : 'Tắt'}`);
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-2 text-white/90">
                  <span className="material-symbols-outlined text-[16px] text-white/60">record_voice_over</span>
                  <span>Thuyết minh AI (by TXA)</span>
                </div>
                <span className={`font-semibold ${aiVoiceover ? 'text-[#a78bfa]' : 'text-white/60'}`}>
                  {aiVoiceover ? 'Đang bật' : 'Tắt'}
                </span>
              </div>

              {/* Chất lượng */}
              <div
                onClick={() => {
                  if (hlsLevels.length > 0) {
                    const nextIdx = (selectedQualityIndex + 2) % (hlsLevels.length + 1) - 1;
                    setSelectedQualityIndex(nextIdx);
                    if (hlsRef.current) hlsRef.current.currentLevel = nextIdx;
                    const label = hlsLevels.find(l => l.index === nextIdx)?.label || 'Auto';
                    showNotice(`Chất lượng: ${label}`);
                  }
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Chất lượng</span>
                <span className="text-white/60 font-semibold">
                  {hlsLevels.find(l => l.index === selectedQualityIndex)?.label || 'Auto'}
                </span>
              </div>

              {/* Tự động Skip (Purple Toggle) */}
              <div
                onClick={() => {
                  const nextVal = !autoSkip;
                  setAutoSkip(nextVal);
                  try {
                    const stored = localStorage.getItem('tsettings');
                    const parsed = stored ? JSON.parse(stored) : {};
                    parsed.autoSkip = nextVal;
                    localStorage.setItem('tsettings', JSON.stringify(parsed));
                  } catch (e) {}
                  showNotice(`Tự động Skip: ${nextVal ? 'Bật' : 'Tắt'}`);
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Tự động Skip</span>
                <div className={`w-10 h-5.5 rounded-full flex items-center p-0.5 transition-colors ${autoSkip ? 'bg-[#7c3aed]' : 'bg-white/20'}`}>
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${autoSkip ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: AUDIO CONFIGURATION MENU (Image 5) */}
          {settingsView === 'audio' && (
            <div className="flex flex-col gap-3">
              {/* Back Button */}
              <div
                onClick={() => setSettingsView('main')}
                className="flex items-center gap-2 text-white font-bold cursor-pointer pb-1 border-b border-white/10"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                <span>Cấu hình âm thanh</span>
              </div>

              {/* Thuyết minh AI (Đọc phụ đề) */}
              <div className="flex items-center justify-between py-1 px-1">
                <span className="text-white/90">Thuyết minh AI (Đọc phụ đề)</span>
                <div
                  onClick={() => {
                    const nextVal = !aiVoiceover;
                    setAiVoiceover(nextVal);
                    localStorage.setItem('txa_voiceover_enabled', String(nextVal));
                  }}
                  className={`w-10 h-5.5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${aiVoiceover ? 'bg-[#7c3aed]' : 'bg-white/20'}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${aiVoiceover ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
                </div>
              </div>

              {/* Âm thanh vòm 3D */}
              <div className="flex items-center justify-between py-1 px-1">
                <span className="text-white/90">Âm thanh vòm 3D</span>
                <div
                  onClick={() => {
                    initAudioNodes();
                    setSurround3D(!surround3D);
                    showNotice(`Âm thanh vòm 3D: ${!surround3D ? 'Bật' : 'Tắt'}`);
                  }}
                  className={`w-10 h-5.5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${surround3D ? 'bg-[#7c3aed]' : 'bg-white/20'}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${surround3D ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
                </div>
              </div>

              {/* Tối ưu EQ (Giọng nói/Bass) */}
              <div className="flex items-center justify-between py-1 px-1">
                <span className="text-white/90">Tối ưu EQ (Giọng nói/Bass)</span>
                <div
                  onClick={() => {
                    initAudioNodes();
                    setEqVoiceBass(!eqVoiceBass);
                    showNotice(`Tối ưu EQ: ${!eqVoiceBass ? 'Bật' : 'Tắt'}`);
                  }}
                  className={`w-10 h-5.5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${eqVoiceBass ? 'bg-[#7c3aed]' : 'bg-white/20'}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${eqVoiceBass ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
                </div>
              </div>

              {/* Khuếch đại âm lượng */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/90">Khuếch đại âm lượng</span>
                  <span className="text-[#a78bfa] font-bold">{volumeAmplifier}%</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="200"
                  value={volumeAmplifier}
                  onChange={e => {
                    initAudioNodes();
                    setVolumeAmplifier(parseInt(e.target.value, 10));
                  }}
                  className="w-full accent-[#7c3aed] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* VIEW 3: SUBTITLE CUSTOMIZATION HUB (Image 2) */}
          {settingsView === 'sub-hub' && (
            <div className="flex flex-col gap-2">
              <div
                onClick={() => setSettingsView('main')}
                className="flex items-center gap-2 text-white font-bold cursor-pointer pb-2 border-b border-white/10"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                <span>Tùy chỉnh kiểu chữ</span>
              </div>

              <div
                onClick={() => setSettingsView('sub-primary')}
                className="flex items-center justify-between py-2.5 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Kiểu phụ đề chính</span>
                <span className="material-symbols-outlined text-white/50 text-[18px]">chevron_right</span>
              </div>

              <div
                onClick={() => setSettingsView('sub-secondary')}
                className="flex items-center justify-between py-2.5 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Kiểu phụ đề phụ</span>
                <span className="material-symbols-outlined text-white/50 text-[18px]">chevron_right</span>
              </div>
            </div>
          )}

          {/* VIEW 4: PRIMARY SUBTITLE STYLING (Image 1) */}
          {settingsView === 'sub-primary' && (
            <div className="flex flex-col gap-1">
              <div
                onClick={() => setSettingsView('sub-hub')}
                className="flex items-center gap-2 text-white font-bold cursor-pointer pb-2 border-b border-white/10 mb-1"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                <span>Kiểu phụ đề chính</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('primary-color');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Màu sắc</span>
                <span className="text-white/60 font-semibold">{getDisplayColorLabel(primaryColor)}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('primary-size');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Cỡ chữ</span>
                <span className="text-white/60 font-semibold">{primarySize}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('primary-font');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Font chữ</span>
                <span className="text-white/60 font-semibold">{primaryFont}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('primary-border');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Bóng viền</span>
                <span className="text-white/60 font-semibold">{primaryBorder}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('primary-opacity');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Độ mờ chữ</span>
                <span className="text-white/60 font-semibold">{primaryOpacity}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('primary-bg');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Nền phụ đề</span>
                <span className="text-white/60 font-semibold">{primaryBg}</span>
              </div>
            </div>
          )}

          {/* VIEW 5: SECONDARY SUBTITLE STYLING */}
          {settingsView === 'sub-secondary' && (
            <div className="flex flex-col gap-1">
              <div
                onClick={() => setSettingsView('sub-hub')}
                className="flex items-center gap-2 text-white font-bold cursor-pointer pb-2 border-b border-white/10 mb-1"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                <span>Kiểu phụ đề phụ</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('secondary-color');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Màu sắc</span>
                <span className="text-white/60 font-semibold">{getDisplayColorLabel(secondaryColor)}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('secondary-size');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Cỡ chữ</span>
                <span className="text-white/60 font-semibold">{secondarySize}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('secondary-font');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Font chữ</span>
                <span className="text-white/60 font-semibold">{secondaryFont}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('secondary-border');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Bóng viền</span>
                <span className="text-white/60 font-semibold">{secondaryBorder}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('secondary-opacity');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Độ mờ chữ</span>
                <span className="text-white/60 font-semibold">{secondaryOpacity}</span>
              </div>

              <div
                onClick={() => {
                  setActiveDetailKey('secondary-bg');
                  setSettingsView('select-detail');
                }}
                className="flex items-center justify-between py-2 px-2 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <span className="text-white/90">Nền phụ đề</span>
                <span className="text-white/60 font-semibold">{secondaryBg}</span>
              </div>
            </div>
          )}

          {/* VIEW 6: OPTION SELECTOR (For any property) */}
          {settingsView === 'select-detail' && activeDetailKey && detailSettingsConfig[activeDetailKey] && (
            <div className="flex flex-col gap-1">
              <div
                onClick={() => setSettingsView(activeDetailKey.startsWith('primary') ? 'sub-primary' : 'sub-secondary')}
                className="flex items-center gap-2 text-white font-bold cursor-pointer pb-2 border-b border-white/10 mb-1"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                <span>{detailSettingsConfig[activeDetailKey].title}</span>
              </div>

              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto txa-custom-scroll">
                {detailSettingsConfig[activeDetailKey].options.map(opt => {
                  const isSelected = detailSettingsConfig[activeDetailKey].current === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        detailSettingsConfig[activeDetailKey].onChange(opt.value);
                        setSettingsView(activeDetailKey.startsWith('primary') ? 'sub-primary' : 'sub-secondary');
                      }}
                      className={`flex items-center justify-between py-2 px-2.5 rounded-xl cursor-pointer ${
                        isSelected ? 'bg-white/10 text-[#7c3aed] font-bold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <span className="material-symbols-outlined text-[16px] text-[#7c3aed]">check</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          BOTTOM CONTROL BAR & SEEKBAR
          ======================================================== */}
      <div
        className={`absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-8 pb-3.5 px-4 transition-opacity duration-300 ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Storyboard Scrubbing Preview Tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute bottom-16 pointer-events-none flex flex-col items-center -translate-x-1/2 z-50 transition-transform duration-75"
            style={{ left: `${hoverPosition}px` }}
          >
            {activeThumbnail ? (
              <div
                className="w-40 h-22.5 rounded-xl border border-white/20 shadow-2xl bg-black overflow-hidden mb-1.5"
                style={{
                  backgroundImage: `url(${activeThumbnail.url})`,
                  backgroundPosition: `-${activeThumbnail.x}px -${activeThumbnail.y}px`,
                  backgroundSize: 'auto',
                  width: `${activeThumbnail.w}px`,
                  height: `${activeThumbnail.h}px`
                }}
              />
            ) : null}
            <div className="bg-black/90 border border-white/15 px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white shadow-xl">
              {formatTime(hoverTime)}
            </div>
          </div>
        )}

        {/* Seekbar Progress Bar */}
        <div
          ref={progressBarRef}
          className="relative w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer transition-all duration-150 mb-3.5 group"
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
          onClick={handleProgressBarClick}
        >
          {/* Buffer Progress */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full pointer-events-none transition-all"
            style={{ width: `${bufferedPercent}%` }}
          />

          {/* Intro Zone Highlight (Blue) */}
          {timeIntroStart > 0 && timeIntroEnd > 0 && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-[#3b82f6]/60 border-x border-[#3b82f6] pointer-events-none"
              style={{
                left: `${(timeIntroStart / duration) * 100}%`,
                width: `${((timeIntroEnd - timeIntroStart) / duration) * 100}%`
              }}
            />
          )}

          {/* Outro Zone Highlight (Red) */}
          {timeOutroStart > 0 && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-[#ef4444]/60 border-x border-[#ef4444] pointer-events-none"
              style={{
                left: `${(timeOutroStart / duration) * 100}%`,
                width: `${((duration - timeOutroStart) / duration) * 100}%`
              }}
            />
          )}

          {/* Played Progress (White / Purple) */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/90 group-hover:bg-[#7c3aed] rounded-full pointer-events-none"
            style={{ width: `${duration > 0 ? (currentPlaybackTime / duration) * 100 : 0}%` }}
          >
            {/* Scrubber Knob */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
          </div>
        </div>

        {/* Controls Layout (Matching exact rounded pill boxes in user images) */}
        <div className="flex items-center justify-between text-white gap-1 sm:gap-2 max-w-full overflow-hidden">
          {/* Left Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink min-w-0">
            {/* Prev Episode */}
            {onPrevEpisode && (
              <TxaTooltip title="Tập trước" shortcut="Shift + P">
                <button
                  onClick={onPrevEpisode}
                  data-txatooltip="Tập trước (Shift + P)"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer border-none text-white/90 transition-all active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px]">skip_previous</span>
                </button>
              </TxaTooltip>
            )}

            {/* Rewind 10s */}
            <TxaTooltip title="Lùi 10 giây" shortcut="← / J">
              <button
                onClick={() => handleSeek(currentPlaybackTime - 10)}
                data-txatooltip="Lùi 10 giây (← / J)"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer border-none text-white/90 transition-all active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">replay_10</span>
              </button>
            </TxaTooltip>

            {/* Play/Pause */}
            <TxaTooltip title={isPlaying ? 'Tạm dừng' : 'Phát'} shortcut="Space / K">
              <button
                onClick={togglePlay}
                data-txatooltip={isPlaying ? 'Tạm dừng (Space / K)' : 'Phát (Space / K)'}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer border-none text-white transition-all active:scale-95 shrink-0 shadow"
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
            </TxaTooltip>

            {/* Forward 10s */}
            <TxaTooltip title="Tua 10 giây" shortcut="→ / L">
              <button
                onClick={() => handleSeek(currentPlaybackTime + 10)}
                data-txatooltip="Tua 10 giây (→ / L)"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer border-none text-white/90 transition-all active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">forward_10</span>
              </button>
            </TxaTooltip>

            {/* Next Episode */}
            {onNextEpisode && (
              <TxaTooltip title="Tập tiếp theo" shortcut="Shift + N">
                <button
                  onClick={onNextEpisode}
                  data-txatooltip="Tập tiếp theo (Shift + N)"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer border-none text-white/90 transition-all active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px]">skip_next</span>
                </button>
              </TxaTooltip>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-1 group/vol relative shrink-0">
              <TxaTooltip title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'} shortcut="M">
                <button
                  onClick={toggleMute}
                  data-txatooltip={isMuted ? 'Bật âm thanh (M)' : 'Tắt tiếng (M)'}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer border-none text-white/90 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                    {isMuted || volume === 0 ? 'volume_off' : volume > 0.5 ? 'volume_up' : 'volume_down'}
                  </span>
                </button>
              </TxaTooltip>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 sm:w-16 h-1 accent-white cursor-pointer hidden md:block"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[10px] sm:text-[11px] font-semibold text-white/80 tabular-nums ml-1 sm:ml-2 font-mono tracking-tight shrink-0 whitespace-nowrap">
              <span>{formatTime(currentPlaybackTime)}</span>
              <span className="text-white/40 mx-0.5 sm:mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls (Exact round pills matching user images) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Speed Button [1x] */}
            <TxaTooltip title="Tốc độ phát">
              <button
                onClick={() => {
                  const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
                  const curIdx = rates.indexOf(playbackRate);
                  const nextRate = rates[(curIdx + 1) % rates.length];
                  handleRateChange(nextRate);
                }}
                data-txatooltip="Tốc độ phát"
                className="hidden xs:flex px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] sm:text-xs font-bold cursor-pointer border-none text-white/90 transition-all active:scale-95 items-center justify-center"
              >
                {playbackRate}x
              </button>
            </TxaTooltip>

            {/* Subtitles Button (if subtitles exist) */}
            {tracks.length > 0 && (
              <TxaTooltip title="Phụ đề" shortcut="C">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === 'subtitles' ? null : 'subtitles');
                    if (contextMenuPos) setContextMenuPos(null);
                  }}
                  data-txatooltip="Phụ đề (C)"
                  className={`txa-menu-toggle-btn w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center cursor-pointer border-none transition-all active:scale-95 ${
                    activeMenu === 'subtitles' || subMode !== 'off'
                      ? 'bg-[#0284c7]/20 text-[#38bdf8] border border-[#38bdf8]/30 shadow-[0_0_12px_rgba(2,132,199,0.3)]'
                      : 'bg-white/5 hover:bg-white/10 text-white/90'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[19px]">subtitles</span>
                </button>
              </TxaTooltip>
            )}

            {/* AI Voiceover Button [🗣️] */}
            <TxaTooltip title="Thuyết minh AI" shortcut="V">
              <button
                onClick={() => {
                  const nextVal = !aiVoiceover;
                  setAiVoiceover(nextVal);
                  localStorage.setItem('txa_voiceover_enabled', String(nextVal));
                  showNotice(`Thuyết minh AI: ${nextVal ? 'Bật' : 'Tắt'}`);
                }}
                data-txatooltip="Thuyết minh AI (V)"
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center cursor-pointer border-none transition-all active:scale-95 ${
                  aiVoiceover
                    ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.6)]'
                    : 'bg-white/5 hover:bg-white/10 text-white/90'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[19px]">record_voice_over</span>
              </button>
            </TxaTooltip>

            {/* Quality Badge [Auto] (Blue filled box in image) */}
            <TxaTooltip title="Chất lượng video">
              <button
                onClick={() => {
                  if (hlsLevels.length > 0) {
                    const nextIdx = (selectedQualityIndex + 2) % (hlsLevels.length + 1) - 1;
                    setSelectedQualityIndex(nextIdx);
                    if (hlsRef.current) hlsRef.current.currentLevel = nextIdx;
                    const label = hlsLevels.find(l => l.index === nextIdx)?.label || 'Auto';
                    showNotice(`Chất lượng: ${label}`);
                  }
                }}
                data-txatooltip="Chất lượng video"
                className="hidden sm:inline-flex px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-[#0c1a2e] border border-[#0284c7]/40 text-[#38bdf8] hover:bg-[#0c2444] text-[11px] sm:text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                {hlsLevels.find(l => l.index === selectedQualityIndex)?.label || 'Auto'}
              </button>
            </TxaTooltip>

            {/* Settings Gear Icon [⚙️] */}
            <TxaTooltip title="Cài đặt" shortcut="S">
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (activeMenu === 'settings') {
                    setActiveMenu(null);
                  } else {
                    setActiveMenu('settings');
                    setSettingsView('main');
                  }
                  if (contextMenuPos) setContextMenuPos(null);
                }}
                data-txatooltip="Cài đặt (S)"
                className={`txa-menu-toggle-btn w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center cursor-pointer border-none transition-all active:scale-95 ${
                  activeMenu === 'settings' ? 'bg-[#7c3aed] text-white' : 'bg-white/5 hover:bg-white/10 text-white/90'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[19px]">settings</span>
              </button>
            </TxaTooltip>

            {/* Fullscreen Button [⛶] */}
            <TxaTooltip title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'} shortcut="F">
              <button
                onClick={toggleFullscreen}
                data-txatooltip={isFullscreen ? 'Thu nhỏ (F)' : 'Toàn màn hình (F)'}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer border-none text-white/90 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                  {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                </span>
              </button>
            </TxaTooltip>
          </div>
        </div>
      </div>

      {/* ========================================================
          DESKTOP RIGHT-CLICK CONTEXT MENU
          ======================================================== */}
      {contextMenuPos && (
        <div
          className="txa-context-menu absolute z-50 bg-[#0f0f14]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-1.5 shadow-2xl w-[230px] text-white text-xs font-sans select-none animate-scale-in"
          style={{ left: `${contextMenuPos.x}px`, top: `${contextMenuPos.y}px` }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header Brand */}
          <div
            onClick={() => {
              const u = (siteUrl && !siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) ? siteUrl : (typeof window !== 'undefined' ? window.location.origin : '');
              if (u) window.open(u, '_blank');
              setContextMenuPos(null);
            }}
            className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-white font-bold cursor-pointer hover:text-[#a78bfa] transition-colors"
          >
            <div className="flex items-center gap-2">
              <img src="/logo-icon.gif" alt="TXA" className="h-4 w-auto object-contain" />
              <span className="truncate">{siteName} Player</span>
            </div>
            <span className="text-[10px] text-[#a78bfa] font-mono">v2.0</span>
          </div>

          <div className="flex flex-col gap-0.5 py-1">
            {/* Play/Pause */}
            <div
              onClick={() => {
                togglePlay();
                setContextMenuPos(null);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-white/70">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                <span>{isPlaying ? 'Tạm dừng' : 'Tiếp tục phát'}</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono">Space</span>
            </div>

            {/* Rewind / Forward 10s */}
            <div
              onClick={() => {
                handleSeek(currentPlaybackTime - 10);
                showNotice('Lùi 10s ⏪');
                setContextMenuPos(null);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-white/70">replay_10</span>
                <span>Lùi lại 10 giây</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono">← / J</span>
            </div>

            <div
              onClick={() => {
                handleSeek(currentPlaybackTime + 10);
                showNotice('Tua 10s ⏩');
                setContextMenuPos(null);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-white/70">forward_10</span>
                <span>Tua tiếp 10 giây</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono">→ / L</span>
            </div>

            {/* Mute */}
            <div
              onClick={() => {
                toggleMute();
                setContextMenuPos(null);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-white/70">
                  {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
                </span>
                <span>{isMuted || volume === 0 ? 'Bật âm thanh' : 'Tắt tiếng'}</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono">M</span>
            </div>

            {/* PiP */}
            <div
              onClick={() => {
                togglePiP();
                setContextMenuPos(null);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-white/70">picture_in_picture_alt</span>
                <span>Hình trong hình (PiP)</span>
              </div>
            </div>

            {/* Fullscreen */}
            <div
              onClick={() => {
                toggleFullscreen();
                setContextMenuPos(null);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-white/70">
                  {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                </span>
                <span>{isFullscreen ? 'Thu nhỏ màn hình' : 'Toàn màn hình'}</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono">F</span>
            </div>

            <div className="h-[1px] bg-white/10 my-1 mx-2"></div>

            {/* Copy Video URL at Current Time */}
            <div
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const urlObj = new URL(window.location.href);
                  urlObj.searchParams.set('t', String(Math.floor(currentPlaybackTime)));
                  navigator.clipboard.writeText(urlObj.toString());
                  showNotice('Đã sao chép link video tại mốc thời gian này 📋');
                }
                setContextMenuPos(null);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-white/70">link</span>
                <span>Sao chép URL video</span>
              </div>
            </div>

            {/* Stats for nerds */}
            <div
              onClick={() => {
                setShowStatsModal(true);
                setContextMenuPos(null);
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-white/70">info</span>
                <span>Thống kê chi tiết</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STATS FOR NERDS MODAL
          ======================================================== */}
      {showStatsModal && (
        <div
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowStatsModal(false)}
        >
          <div
            className="bg-[#0f0f14] border border-white/15 rounded-2xl p-5 shadow-2xl max-w-[420px] w-full text-white text-xs font-mono"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <span className="text-sm font-bold text-[#a78bfa] font-sans flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">query_stats</span>
                Thống kê phát sóng (Stats)
              </span>
              <button
                onClick={() => setShowStatsModal(false)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer border-none text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2 text-white/80">
              <div className="flex justify-between">
                <span className="text-white/40">Engine / Player:</span>
                <span className="font-bold text-white">TXAPlayer v2.0 (HLS.js)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Độ phân giải video:</span>
                <span className="font-bold text-[#38bdf8]">
                  {videoRef.current?.videoWidth || 1920}x{videoRef.current?.videoHeight || 1080}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Chất lượng hiện tại:</span>
                <span>{hlsLevels.find(l => l.index === selectedQualityIndex)?.label || 'Auto'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Thời lượng buffer:</span>
                <span>{bufferedPercent.toFixed(1)}% ({formatTime(duration * (bufferedPercent / 100))})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Âm lượng / EQ Boost:</span>
                <span>{Math.round(volume * 100)}% / Khuếch đại {volumeAmplifier}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Âm thanh vòm 3D:</span>
                <span>{surround3D ? 'Đang bật' : 'Tắt'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Thuyết minh AI:</span>
                <span>{aiVoiceover ? 'Đang đọc' : 'Tắt'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">IP Người xem:</span>
                <span>{displayIp || '14.171.178.99'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
