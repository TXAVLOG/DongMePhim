import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Artplayer from 'artplayer';

export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

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

export function parseSubtitles(text: string): SubtitleCue[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues: SubtitleCue[] = [];
  const timeRegex = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

  let currentCue: Partial<SubtitleCue> | null = null;
  let textBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().replace(/\{[^}]+\}/g, '');
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
        if (prevLine && !prevLine.match(timeRegex) && isNaN(Number(prevLine)) === false) {
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

const artplayerPluginVttThumbnail = (vttUrl: string) => {
  return async function (art: any) {
    if (!vttUrl) return;

    const cues: { startTime: number; endTime: number; url: string; x: number; y: number; w: number; h: number; }[] = [];
    try {
      const proxied = proxySubtitleUrl(vttUrl);
      const res = await fetch(proxied);
      if (!res.ok) return;
      const rawText = await res.text();
      const text = rawText.replace(/^\uFEFF/, '');
      const baseUrl = vttUrl.substring(0, vttUrl.lastIndexOf('/') + 1);

      const timeRegex = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;
      const lines = text.split(/\r?\n/);
      let currentCue: { startTime: number; endTime: number } | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(timeRegex);
        if (match) {
          const startSec = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
          const endSec = parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]) + parseInt(match[8]) / 1000;
          currentCue = { startTime: startSec, endTime: endSec };
        } else if (currentCue && line !== '') {
          if (line.includes('#xywh=')) {
            const parts = line.split('#');
            const imgPath = parts[0] || '';
            const hash = parts[1] || '';

            let absoluteImgUrl = imgPath;
            if (!imgPath.startsWith('http') && !imgPath.startsWith('/') && !imgPath.startsWith('data:')) {
              absoluteImgUrl = baseUrl + imgPath;
            }

            const decodedImgUrl = decodeURI(absoluteImgUrl);
            const encodedImgUrl = encodeURI(decodedImgUrl);

            const xywhMatch = hash.match(/xywh=(\d+),(\d+),(\d+),(\d+)/);
            if (xywhMatch) {
              cues.push({
                startTime: currentCue.startTime,
                endTime: currentCue.endTime,
                url: encodedImgUrl,
                x: parseInt(xywhMatch[1]),
                y: parseInt(xywhMatch[2]),
                w: parseInt(xywhMatch[3]),
                h: parseInt(xywhMatch[4])
              });
            }
          }
          currentCue = null;
        }
      }
    } catch (e) {
      console.error('Error in custom VTT thumbnail plugin:', e);
      return;
    }

    if (cues.length === 0) return;

    const $progress = art.template.$progress;
    if (!$progress) return;

    const $thumbnails = document.createElement('div');
    $thumbnails.className = 'art-control-thumbnails';
    Object.assign($thumbnails.style, {
      position: 'absolute',
      bottom: '20px',
      left: '0',
      display: 'none',
      border: '2px solid #fff',
      borderRadius: '4px',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#000',
      boxShadow: '0 0 10px rgba(0,0,0,0.5)',
      zIndex: '100',
      pointerEvents: 'none',
      transform: 'translate(-50%, 0)',
    });

    const $timeTooltip = document.createElement('div');
    Object.assign($timeTooltip.style, {
      position: 'absolute',
      bottom: '-25px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: '#fff',
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '11px',
      whiteSpace: 'nowrap',
      border: '1px solid rgba(255,255,255,0.1)',
    });

    $thumbnails.appendChild($timeTooltip);
    $progress.appendChild($thumbnails);

    const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const pad = (n: number) => String(n).padStart(2, '0');
      return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    };

    const uniqueUrls = Array.from(new Set(cues.map(c => c.url)));
    uniqueUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });

    art.on('setBar', (type: string, percentage: number) => {
      if (type === 'hover') {
        const hoverTime = percentage * art.duration;
        const cue = cues.find(c => hoverTime >= c.startTime && hoverTime <= c.endTime);

        if (cue) {
          $thumbnails.style.display = 'block';
          $thumbnails.style.backgroundImage = `url(${cue.url})`;
          $thumbnails.style.backgroundPosition = `-${cue.x}px -${cue.y}px`;
          $thumbnails.style.width = `${cue.w}px`;
          $thumbnails.style.height = `${cue.h}px`;

          const progressWidth = $progress.clientWidth;
          const leftPos = progressWidth * percentage;
          $thumbnails.style.left = `${leftPos}px`;

          $timeTooltip.innerText = formatTime(hoverTime);
        } else {
          $thumbnails.style.display = 'none';
        }
      }
    });

    const handleMouseLeave = () => {
      $thumbnails.style.display = 'none';
    };
    $progress.addEventListener('mouseleave', handleMouseLeave);

    art.on('destroy', () => {
      if ($thumbnails && $thumbnails.parentNode) {
        $thumbnails.parentNode.removeChild($thumbnails);
      }
      $progress.removeEventListener('mouseleave', handleMouseLeave);
    });
  };
};

const CustomSubtitleSystem: React.FC<{
  art: Artplayer;
  subtitles: Subtitle[];
}> = ({ art, subtitles }) => {
  const [mode, setMode] = useState<'on' | 'bilingual' | 'off'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('txa_sub_mode') as any) || 'on';
    }
    return 'on';
  });

  const [primaryIdx, setPrimaryIdx] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const idxStr = localStorage.getItem('txa_sub_primary_idx');
      return idxStr ? parseInt(idxStr) : 0;
    }
    return 0;
  });

  const [secondaryIdx, setSecondaryIdx] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const idxStr = localStorage.getItem('txa_sub_secondary_idx');
      return idxStr ? parseInt(idxStr) : 1;
    }
    return 1;
  });

  const [tracks, setTracks] = useState<any[]>(subtitles);
  const [primaryCues, setPrimaryCues] = useState<SubtitleCue[]>([]);
  const [secondaryCues, setSecondaryCues] = useState<SubtitleCue[]>([]);

  const [activePrimaryCue, setActivePrimaryCue] = useState<SubtitleCue | null>(null);
  const [activeSecondaryCue, setActiveSecondaryCue] = useState<SubtitleCue | null>(null);

  const [showPanel, setShowPanel] = useState(false);
  const [panelView, setPanelView] = useState<'main' | 'custom' | 'select-option'>('main');
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [bottomOffset, setBottomOffset] = useState(80);

  const fetchedCuesRef = useRef<Record<string, SubtitleCue[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('txa_sub_primary_color') || '#ffffff');
  const [primarySize, setPrimarySize] = useState(() => localStorage.getItem('txa_sub_primary_size') || '14pt');
  const [primaryOpacity, setPrimaryOpacity] = useState(() => localStorage.getItem('txa_sub_primary_opacity') || '100%');
  const [primaryFont, setPrimaryFont] = useState(() => localStorage.getItem('txa_sub_primary_font') || 'Arial');
  const [primaryBorder, setPrimaryBorder] = useState(() => localStorage.getItem('txa_sub_primary_border') || 'Bóng đổ');
  const [primaryBgColor, setPrimaryBgColor] = useState(() => localStorage.getItem('txa_sub_primary_bg_color') || 'Đen');
  const [primaryBgOpacity, setPrimaryBgOpacity] = useState(() => localStorage.getItem('txa_sub_primary_bg_opacity') || '0%');

  const [secondaryColor, setSecondaryColor] = useState(() => localStorage.getItem('txa_sub_secondary_color') || '#ffeb3b');
  const [secondarySize, setSecondarySize] = useState(() => localStorage.getItem('txa_sub_secondary_size') || '14pt');
  const [secondaryOpacity, setSecondaryOpacity] = useState(() => localStorage.getItem('txa_sub_secondary_opacity') || '100%');
  const [secondaryFont, setSecondaryFont] = useState(() => localStorage.getItem('txa_sub_secondary_font') || 'Arial');
  const [secondaryBorder, setSecondaryBorder] = useState(() => localStorage.getItem('txa_sub_secondary_border') || 'Viền mỏng');
  const [secondaryBgColor, setSecondaryBgColor] = useState(() => localStorage.getItem('txa_sub_secondary_bg_color') || 'Đen');
  const [secondaryBgOpacity, setSecondaryBgOpacity] = useState(() => localStorage.getItem('txa_sub_secondary_bg_opacity') || '0%');

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const cues = parseSubtitles(text);
        if (cues.length > 0) {
          const newTrack = {
            label: file.name.substring(0, 15) || 'Tải lên',
            file: `uploaded-${Date.now()}`,
            cues: cues
          };
          setTracks(prev => [...prev, newTrack]);
          setPrimaryIdx(tracks.length);
          if (mode === 'off') {
            setMode('on');
            localStorage.setItem('txa_sub_mode', 'on');
          }
          if (art.notice) {
            art.notice.show = `Đã tải phụ đề: ${file.name}`;
          }
        } else {
          alert('Không thể phân tích cú pháp tệp phụ đề này. Vui lòng kiểm tra lại định dạng SRT hoặc VTT!');
        }
      }
    };
    reader.readAsText(file);
  };

  // Prevent primary and secondary tracks from being the same
  useEffect(() => {
    if (primaryIdx === secondaryIdx) {
      const nextSecondaryIdx = tracks.findIndex((_, idx) => idx !== primaryIdx);
      if (nextSecondaryIdx !== -1) {
        setSecondaryIdx(nextSecondaryIdx);
        localStorage.setItem('txa_sub_secondary_idx', String(nextSecondaryIdx));
      }
    }
  }, [primaryIdx, secondaryIdx, tracks]);

  useEffect(() => {
    const loadCues = async (track: any, setCues: (cues: SubtitleCue[]) => void) => {
      if (!track) {
        setCues([]);
        return;
      }
      if (track.cues) {
        setCues(track.cues);
        return;
      }
      if (fetchedCuesRef.current[track.file]) {
        setCues(fetchedCuesRef.current[track.file]);
        return;
      }
      try {
        const proxied = proxySubtitleUrl(track.file);
        const res = await fetch(proxied);
        if (res.ok) {
          const text = await res.text();
          const cues = parseSubtitles(text);
          fetchedCuesRef.current[track.file] = cues;
          setCues(cues);
        }
      } catch (e) {
        console.error('Error loading subtitles:', e);
      }
    };

    const pTrack = tracks[primaryIdx];
    const sTrack = tracks[secondaryIdx];

    loadCues(pTrack, setPrimaryCues);
    loadCues(sTrack, setSecondaryCues);
  }, [tracks, primaryIdx, secondaryIdx]);

  useEffect(() => {
    const updateActiveCues = () => {
      const time = art.video.currentTime;

      if (mode !== 'off' && primaryCues.length > 0) {
        const cue = primaryCues.find(c => time >= c.startTime && time <= c.endTime);
        setActivePrimaryCue(cue || null);
      } else {
        setActivePrimaryCue(null);
      }

      if (mode === 'bilingual' && secondaryCues.length > 0) {
        const cue = secondaryCues.find(c => time >= c.startTime && time <= c.endTime);
        setActiveSecondaryCue(cue || null);
      } else {
        setActiveSecondaryCue(null);
      }
    };

    art.on('video:timeupdate', updateActiveCues);
    art.on('video:seeked', updateActiveCues);

    const handleControlState = (visible: boolean) => {
      setBottomOffset(visible ? 80 : 30);
    };
    art.on('control', handleControlState);

    const handleTogglePanel = () => {
      setShowPanel(prev => !prev);
      setPanelView('main');
    };
    window.addEventListener('txa-toggle-subtitle-panel', handleTogglePanel);

    return () => {
      art.off('video:timeupdate', updateActiveCues);
      art.off('video:seeked', updateActiveCues);
      art.off('control', handleControlState);
      window.removeEventListener('txa-toggle-subtitle-panel', handleTogglePanel);
    };
  }, [art, primaryCues, secondaryCues, mode]);

  useEffect(() => {
    if (!showPanel) return;

    const handleOutsideClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.txa-sub-control-panel-wrapper') && !target.closest('.art-control-custom-subtitles')) {
        setShowPanel(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showPanel]);

  const getSubStyle = (isPrimary: boolean) => {
    const color = isPrimary ? primaryColor : secondaryColor;
    const size = isPrimary ? primarySize : secondarySize;
    const opacityVal = isPrimary ? primaryOpacity : secondaryOpacity;
    const font = isPrimary ? primaryFont : secondaryFont;
    
    let adaptedSize = size;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (size.endsWith('pt')) {
        adaptedSize = `${parseFloat(size) * 0.85}pt`;
      } else if (size.endsWith('px')) {
        adaptedSize = `${parseFloat(size) * 0.85}px`;
      } else if (size.endsWith('%')) {
        adaptedSize = `${parseFloat(size) * 0.85}%`;
      }
    }

    const op = parseFloat(opacityVal) / 100;
    const fontFamily = font === 'Sans-Serif' ? 'sans-serif' : `'${font}', sans-serif`;

    let textShadow = 'none';
    const borderVal = isPrimary ? primaryBorder : secondaryBorder;
    if (borderVal === 'Bóng đổ') {
      textShadow = '0 2px 4px rgba(0,0,0,0.9)';
    } else if (borderVal === 'Viền mỏng') {
      textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
    } else if (borderVal === 'Viền dày') {
      textShadow = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000';
    }

    let background = 'transparent';
    let padding = '0';
    let borderRadius = '0';
    const bgColorVal = isPrimary ? primaryBgColor : secondaryBgColor;
    const bgOpacityVal = isPrimary ? primaryBgOpacity : secondaryBgOpacity;
    if (bgOpacityVal !== '0%') {
      const bgOp = parseFloat(bgOpacityVal) / 100;
      let rgb = '0,0,0';
      if (bgColorVal === 'Xám') rgb = '85,85,85';
      else if (bgColorVal === 'Đỏ') rgb = '244,67,54';
      else if (bgColorVal === 'Xanh') rgb = '76,175,80';
      else if (bgColorVal === 'Trắng') rgb = '255,255,255';
      background = `rgba(${rgb}, ${bgOp})`;
      padding = '4px 10px';
      borderRadius = '6px';
    }

    return {
      color,
      fontSize: adaptedSize,
      opacity: op,
      fontFamily,
      fontWeight: isPrimary ? 500 : 600,
      textShadow,
      background,
      padding,
      borderRadius,
      margin: '4px 0',
      lineHeight: '1.4',
      whiteSpace: 'pre-wrap' as const,
      display: 'inline-block',
      textAlign: 'center' as const
    };
  };

  const formatCueText = (text: string) => {
    let html = text.replace(/\n/g, '<br />');
    return { __html: html };
  };

  const settingsConfig = [
    {
      key: 'primaryColor',
      label: 'Màu chữ',
      section: 'Phụ đề chính',
      value: primaryColor,
      displayValue: primaryColor === '#ffffff' ? 'Trắng' : primaryColor === '#ffeb3b' ? 'Vàng' : primaryColor === '#4caf50' ? 'Xanh lá' : primaryColor === '#2196f3' ? 'Xanh dương' : 'Đỏ',
      options: [
        { label: 'Trắng', value: '#ffffff' },
        { label: 'Vàng', value: '#ffeb3b' },
        { label: 'Xanh lá', value: '#4caf50' },
        { label: 'Xanh dương', value: '#2196f3' },
        { label: 'Đỏ', value: '#f44336' }
      ],
      setter: (val: string) => {
        setPrimaryColor(val);
        localStorage.setItem('txa_sub_primary_color', val);
      }
    },
    {
      key: 'primarySize',
      label: 'Cỡ chữ',
      section: 'Phụ đề chính',
      value: primarySize,
      displayValue: primarySize,
      options: [
        { label: '12pt', value: '12pt' },
        { label: '14pt', value: '14pt' },
        { label: '16pt', value: '16pt' },
        { label: '18pt', value: '18pt' },
        { label: '20pt', value: '20pt' },
        { label: '24pt', value: '24pt' },
        { label: '28pt', value: '28pt' }
      ],
      setter: (val: string) => {
        setPrimarySize(val);
        localStorage.setItem('txa_sub_primary_size', val);
      }
    },
    {
      key: 'primaryOpacity',
      label: 'Độ trong',
      section: 'Phụ đề chính',
      value: primaryOpacity,
      displayValue: primaryOpacity,
      options: [
        { label: '25%', value: '25%' },
        { label: '50%', value: '50%' },
        { label: '75%', value: '75%' },
        { label: '100%', value: '100%' }
      ],
      setter: (val: string) => {
        setPrimaryOpacity(val);
        localStorage.setItem('txa_sub_primary_opacity', val);
      }
    },
    {
      key: 'primaryFont',
      label: 'Font chữ',
      section: 'Phụ đề chính',
      value: primaryFont,
      displayValue: primaryFont,
      options: [
        { label: 'Arial', value: 'Arial' },
        { label: 'Outfit', value: 'Outfit' },
        { label: 'Inter', value: 'Inter' },
        { label: 'Roboto', value: 'Roboto' },
        { label: 'Sans-Serif', value: 'Sans-Serif' }
      ],
      setter: (val: string) => {
        setPrimaryFont(val);
        localStorage.setItem('txa_sub_primary_font', val);
      }
    },
    {
      key: 'primaryBorder',
      label: 'Viền chữ',
      section: 'Phụ đề chính',
      value: primaryBorder,
      displayValue: primaryBorder,
      options: [
        { label: 'Không viền', value: 'Không viền' },
        { label: 'Bóng đổ', value: 'Bóng đổ' },
        { label: 'Viền mỏng', value: 'Viền mỏng' },
        { label: 'Viền dày', value: 'Viền dày' }
      ],
      setter: (val: string) => {
        setPrimaryBorder(val);
        localStorage.setItem('txa_sub_primary_border', val);
      }
    },
    {
      key: 'primaryBgColor',
      label: 'Màu nền',
      section: 'Phụ đề chính',
      value: primaryBgColor,
      displayValue: primaryBgColor,
      options: [
        { label: 'Đen', value: 'Đen' },
        { label: 'Xám', value: 'Xám' },
        { label: 'Đỏ', value: 'Đỏ' },
        { label: 'Xanh', value: 'Xanh' },
        { label: 'Trắng', value: 'Trắng' }
      ],
      setter: (val: string) => {
        setPrimaryBgColor(val);
        localStorage.setItem('txa_sub_primary_bg_color', val);
      }
    },
    {
      key: 'primaryBgOpacity',
      label: 'Độ trong nền',
      section: 'Phụ đề chính',
      value: primaryBgOpacity,
      displayValue: primaryBgOpacity,
      options: [
        { label: '0%', value: '0%' },
        { label: '25%', value: '25%' },
        { label: '50%', value: '50%' },
        { label: '75%', value: '75%' },
        { label: '100%', value: '100%' }
      ],
      setter: (val: string) => {
        setPrimaryBgOpacity(val);
        localStorage.setItem('txa_sub_primary_bg_opacity', val);
      }
    },
    // Secondary
    {
      key: 'secondaryColor',
      label: 'Màu chữ',
      section: 'Song ngữ',
      value: secondaryColor,
      displayValue: secondaryColor === '#ffffff' ? 'Trắng' : secondaryColor === '#ffeb3b' ? 'Vàng' : secondaryColor === '#4caf50' ? 'Xanh lá' : secondaryColor === '#2196f3' ? 'Xanh dương' : 'Đỏ',
      options: [
        { label: 'Trắng', value: '#ffffff' },
        { label: 'Vàng', value: '#ffeb3b' },
        { label: 'Xanh lá', value: '#4caf50' },
        { label: 'Xanh dương', value: '#2196f3' },
        { label: 'Đỏ', value: '#f44336' }
      ],
      setter: (val: string) => {
        setSecondaryColor(val);
        localStorage.setItem('txa_sub_secondary_color', val);
      }
    },
    {
      key: 'secondarySize',
      label: 'Cỡ chữ',
      section: 'Song ngữ',
      value: secondarySize,
      displayValue: secondarySize,
      options: [
        { label: '10pt', value: '10pt' },
        { label: '12pt', value: '12pt' },
        { label: '14pt', value: '14pt' },
        { label: '16pt', value: '16pt' },
        { label: '18pt', value: '18pt' },
        { label: '20pt', value: '20pt' },
        { label: '70%', value: '70%' },
        { label: '80%', value: '80%' },
        { label: '90%', value: '90%' },
        { label: '100%', value: '100%' }
      ],
      setter: (val: string) => {
        setSecondarySize(val);
        localStorage.setItem('txa_sub_secondary_size', val);
      }
    },
    {
      key: 'secondaryOpacity',
      label: 'Độ trong',
      section: 'Song ngữ',
      value: secondaryOpacity,
      displayValue: secondaryOpacity,
      options: [
        { label: '25%', value: '25%' },
        { label: '50%', value: '50%' },
        { label: '75%', value: '75%' },
        { label: '100%', value: '100%' }
      ],
      setter: (val: string) => {
        setSecondaryOpacity(val);
        localStorage.setItem('txa_sub_secondary_opacity', val);
      }
    },
    {
      key: 'secondaryFont',
      label: 'Font chữ',
      section: 'Song ngữ',
      value: secondaryFont,
      displayValue: secondaryFont,
      options: [
        { label: 'Arial', value: 'Arial' },
        { label: 'Outfit', value: 'Outfit' },
        { label: 'Inter', value: 'Inter' },
        { label: 'Roboto', value: 'Roboto' },
        { label: 'Sans-Serif', value: 'Sans-Serif' }
      ],
      setter: (val: string) => {
        setSecondaryFont(val);
        localStorage.setItem('txa_sub_secondary_font', val);
      }
    },
    {
      key: 'secondaryBorder',
      label: 'Viền chữ',
      section: 'Song ngữ',
      value: secondaryBorder,
      displayValue: secondaryBorder,
      options: [
        { label: 'Không viền', value: 'Không viền' },
        { label: 'Bóng đổ', value: 'Bóng đổ' },
        { label: 'Viền mỏng', value: 'Viền mỏng' },
        { label: 'Viền dày', value: 'Viền dày' }
      ],
      setter: (val: string) => {
        setSecondaryBorder(val);
        localStorage.setItem('txa_sub_secondary_border', val);
      }
    },
    {
      key: 'secondaryBgColor',
      label: 'Màu nền',
      section: 'Song ngữ',
      value: secondaryBgColor,
      displayValue: secondaryBgColor,
      options: [
        { label: 'Đen', value: 'Đen' },
        { label: 'Xám', value: 'Xám' },
        { label: 'Đỏ', value: 'Đỏ' },
        { label: 'Xanh', value: 'Xanh' },
        { label: 'Trắng', value: 'Trắng' }
      ],
      setter: (val: string) => {
        setSecondaryBgColor(val);
        localStorage.setItem('txa_sub_secondary_bg_color', val);
      }
    },
    {
      key: 'secondaryBgOpacity',
      label: 'Độ trong nền',
      section: 'Song ngữ',
      value: secondaryBgOpacity,
      displayValue: secondaryBgOpacity,
      options: [
        { label: '0%', value: '0%' },
        { label: '25%', value: '25%' },
        { label: '50%', value: '50%' },
        { label: '75%', value: '75%' },
        { label: '100%', value: '100%' }
      ],
      setter: (val: string) => {
        setSecondaryBgOpacity(val);
        localStorage.setItem('txa_sub_secondary_bg_opacity', val);
      }
    }
  ];

  const currentActiveSettingObj = settingsConfig.find(s => s.key === selectedSetting);

  return (
    <>
      <div 
        className="txa-subtitles-container" 
        style={{
          position: 'absolute',
          bottom: `${bottomOffset}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '85%',
          pointerEvents: 'none',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          zIndex: 35,
          transition: 'bottom 0.3s ease'
        }}
      >
        {mode === 'bilingual' && activeSecondaryCue && (
          <div 
            style={getSubStyle(false)}
            dangerouslySetInnerHTML={formatCueText(activeSecondaryCue.text)}
          />
        )}
        {mode !== 'off' && activePrimaryCue && (
          <div 
            style={getSubStyle(true)}
            dangerouslySetInnerHTML={formatCueText(activePrimaryCue.text)}
          />
        )}
      </div>

      {showPanel && (
        <div 
          className="txa-sub-control-panel-wrapper"
          style={{
            position: 'absolute',
            bottom: `${bottomOffset + 10}px`,
            right: typeof window !== 'undefined' && window.innerWidth < 768 ? '10px' : '20px',
            left: typeof window !== 'undefined' && window.innerWidth < 768 ? '10px' : 'auto',
            width: typeof window !== 'undefined' && window.innerWidth < 768 ? 'auto' : '380px',
            maxWidth: 'calc(100% - 20px)',
            backgroundColor: 'rgba(15, 15, 20, 0.92)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            padding: '16px',
            zIndex: 1000,
            pointerEvents: 'auto',
            fontFamily: "'Outfit', sans-serif",
            userSelect: 'none'
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {panelView === 'main' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>Phụ đề</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '2px' }}>
                    {(['on', 'bilingual', 'off'] as const).map(m => {
                      const label = m === 'on' ? 'Bật' : m === 'bilingual' ? 'Song ngữ' : 'Tắt';
                      const isActive = mode === m;
                      return (
                        <button
                          key={m}
                          onClick={() => {
                            setMode(m);
                            localStorage.setItem('txa_sub_mode', m);
                          }}
                          style={{
                            border: 'none',
                            outline: 'none',
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            backgroundColor: isActive ? '#ffffff' : 'transparent',
                            color: isActive ? '#0b0a0c' : '#ffffff',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    onClick={handleUploadClick}
                    style={{
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    title="Tải phụ đề local lên"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>upload</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept=".srt,.vtt" 
                    onChange={handleFileUpload} 
                  />

                  <button 
                    onClick={() => setPanelView('custom')}
                    style={{
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    title="Tuỳ chỉnh kiểu dáng"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>settings</span>
                  </button>
                </div>
              </div>

              {mode !== 'off' ? (
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <div style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: '10px', padding: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phụ đề chính</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                      {tracks.map((t, idx) => {
                        const isSelected = primaryIdx === idx;
                        return (
                          <div 
                            key={t.file} 
                            onClick={() => {
                              setPrimaryIdx(idx);
                              localStorage.setItem('txa_sub_primary_idx', String(idx));
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                              fontWeight: isSelected ? 600 : 400
                            }}
                          >
                            <span style={{ color: isSelected ? '#ffeb3b' : '#ffffff' }}>{t.label}</span>
                            {isSelected && <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ffeb3b' }}>check</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div 
                    style={{ 
                      flex: 1, 
                      backgroundColor: 'rgba(0, 0, 0, 0.25)', 
                      borderRadius: '10px', 
                      padding: '8px', 
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      opacity: mode === 'bilingual' ? 1 : 0.35,
                      pointerEvents: mode === 'bilingual' ? 'auto' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Song ngữ</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                      {tracks.map((t, idx) => {
                        if (idx === primaryIdx) return null;
                        const isSelected = secondaryIdx === idx;
                        return (
                          <div 
                            key={t.file} 
                            onClick={() => {
                              setSecondaryIdx(idx);
                              localStorage.setItem('txa_sub_secondary_idx', String(idx));
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                              fontWeight: isSelected ? 600 : 400
                            }}
                          >
                            <span style={{ color: isSelected ? '#ffeb3b' : '#ffffff' }}>{t.label}</span>
                            {isSelected && <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ffeb3b' }}>check</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                  Phụ đề đã bị tắt. Vui lòng chọn "Bật" hoặc "Song ngữ" để kích hoạt.
                </div>
              )}
            </div>
          )}

          {panelView === 'custom' && (
            <div>
              <div 
                onClick={() => setPanelView('main')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  marginBottom: '14px',
                  color: '#ffffff'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                <span>Tuỳ chỉnh</span>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, paddingBottom: '6px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '6px' }}>Phụ đề chính</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {settingsConfig.filter(s => s.section === 'Phụ đề chính').map(item => (
                      <div 
                        key={item.key}
                        onClick={() => {
                          setSelectedSetting(item.key);
                          setPanelView('select-option');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e88e5', fontWeight: 600 }}>
                          <span>{item.displayValue}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, paddingBottom: '6px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '6px' }}>Song ngữ</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {settingsConfig.filter(s => s.section === 'Song ngữ').map(item => (
                      <div 
                        key={item.key}
                        onClick={() => {
                          setSelectedSetting(item.key);
                          setPanelView('select-option');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e88e5', fontWeight: 600 }}>
                          <span>{item.displayValue}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {panelView === 'select-option' && currentActiveSettingObj && (
            <div>
              <div 
                onClick={() => setPanelView('custom')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  marginBottom: '14px',
                  color: '#ffffff'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                <span>{currentActiveSettingObj.label}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '260px', overflowY: 'auto' }}>
                {currentActiveSettingObj.options.map(opt => {
                  const isChecked = currentActiveSettingObj.value === opt.value;
                  return (
                    <div 
                      key={opt.value}
                      onClick={() => {
                        currentActiveSettingObj.setter(opt.value);
                        setPanelView('custom');
                        if (art.notice) {
                          art.notice.show = `Đã cập nhật ${currentActiveSettingObj.label}: ${opt.label}`;
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        backgroundColor: isChecked ? 'rgba(255,255,255,0.06)' : 'transparent',
                        fontWeight: isChecked ? 600 : 400
                      }}
                    >
                      <span style={{ color: isChecked ? '#1e88e5' : '#ffffff' }}>{opt.label}</span>
                      {isChecked && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#1e88e5' }}>check</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};


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
  storyboardUrl?: string;
  autoNextEpisode?: boolean;
  nextEpisode?: {
    title: string;
    episodeName: string;
    thumbnail: string;
    slug: string;
  };
  onNextEpisode?: () => void;
  prevEpisode?: {
    title: string;
    episodeName: string;
    thumbnail: string;
    slug: string;
  };
  onPrevEpisode?: () => void;
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
  autoplay = false,
  storyboardUrl,
  autoNextEpisode = false,
  nextEpisode,
  onNextEpisode,
  prevEpisode,
  onPrevEpisode
}) => {
  const artRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<Artplayer | null>(null);
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);
  const [connectionRestored, setConnectionRestored] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [showNextEpisodePopup, setShowNextEpisodePopup] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showSwitchingToast, setShowSwitchingToast] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const popupShownRef = useRef(false);

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

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
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
      // Chuyển Cloudflare Worker URL (có CORS) sang R2 public URL (đã bật CORS)
      if (rawUrl.includes('webfilm.txasoftdev.workers.dev/txa_media/')) {
        return rawUrl.replace(
          'https://webfilm.txasoftdev.workers.dev/txa_media/',
          'https://pub-23023fab408a4b7aa2786bfde1d472d9.r2.dev/txa_media/'
        );
      }
      return rawUrl;
    };

    const realUrl = getRealStreamUrl(url);

    const initPlayer = (HlsClass: any) => {
      if (!artRef.current) return;

      let handlePageLoad: (() => void) | null = null;

      if (playerInstanceRef.current) {
        try {
          const oldArt = playerInstanceRef.current;
          if (oldArt.video) {
            oldArt.video.pause();
            oldArt.video.removeAttribute('src');
            try { oldArt.video.load(); } catch (e) {}
          }
        } catch (e) {}
        try {
          playerInstanceRef.current.destroy(false);
        } catch (e) {}
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

      const artOptions: any = {
        container: artRef.current,
        url: realUrl,
        poster: poster || '',
        plugins: storyboardUrl ? [
          artplayerPluginVttThumbnail(storyboardUrl)
        ] : [],
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
        autoOrientation: true,
        fastForward: true,
        lock: true,
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
            'Exit Fullscreen': 'Thoát toàn màn hình',
            'Web Fullscreen': 'Toàn màn hình web',
            'Exit Web Fullscreen': 'Thoát toàn màn hình web',
            'Playback Rate': 'Tốc độ phát',
            'Aspect Ratio': 'Tỷ lệ khung hình',
            'Flip': 'Lật hình',
            'Normal': 'Bình thường',
            'Subtitle': 'Phụ đề',
            'Auto': 'Tự động',
            'Loop': 'Lặp lại',
            'Airplay': 'Phát qua Airplay',
            'PIP': 'Hình trong hình',
            'Video Info': 'Thông tin video',
            'Close': 'Đóng',
            'Video Load Failed': 'Tải video thất bại',
            'Rate': 'Tốc độ',
            'Video Flip': 'Lật video',
            'Horizontal': 'Ngang',
            'Vertical': 'Dọc',
            'Reconnect': 'Kết nối lại',
            'Show Setting': 'Hiện cài đặt',
            'Hide Setting': 'Ẩn cài đặt',
            'Play Speed': 'Tốc độ phát',
            'Default': 'Mặc định',
            'Open': 'Mở',
            'Switch Video': 'Chuyển video',
            'Switch Subtitle': 'Chuyển phụ đề',
            'Picture in Picture': 'Hình trong hình',
            'Exit Picture in Picture': 'Thoát hình trong hình',
            'AirPlay': 'Phát qua AirPlay',
            'AirPlay Available': 'AirPlay khả dụng',
            'Subtitle Offset': 'Lệch phụ đề',
            'Last Seen': 'Xem lần cuối',
            'Jump Play': 'Nhảy đến',
            'Quality': 'Chất lượng',
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
        highlight: [
          ...(timeIntroStart > 0 ? [{ time: timeIntroStart, text: 'Bắt đầu Intro' }] : []),
          ...(timeIntroEnd > 0 ? [{ time: timeIntroEnd, text: 'Kết thúc Intro' }] : []),
          ...(timeOutroStart > 0 ? [{ time: timeOutroStart, text: 'Bắt đầu Outro' }] : []),
        ],
        customType: {
          m3u8: function (video: HTMLVideoElement, url: string) {
            if (HlsClass && HlsClass.isSupported()) {
              const hls = new HlsClass({
                // Obfuscate network requests to make extensions harder to sniff
                xhrSetup: (xhr: XMLHttpRequest, xhrUrl: string) => {
                  // Do not send custom headers to cross-origin CDN servers to prevent CORS preflight blocking
                },
                // Enable worker for better performance and stability
                enableWorker: true,
                // Lower max buffer to reduce memory issues with large segments
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                // Enable progressive loading for faster start
                progressive: true,
                // Handle audio codec errors gracefully - if browser doesn't support
                // EAC-3/AC-3 (Dolby Digital Plus) in MSE, try to recover
                backBufferLength: 30,
              });
              hls.loadSource(url);
              hls.attachMedia(video);


              // Recovery attempt tracking to prevent infinite recovery loops
              let mediaErrorRecoveryAttempts = 0;
              const MAX_MEDIA_RECOVERY_ATTEMPTS = 3;
              let audioBufferErrorCount = 0;
              const MAX_AUDIO_BUFFER_ERRORS = 3;
              let hasReloadedWithoutAudio = false;

              // Bắt sự kiện lỗi Hls.js để tự động phục hồi luồng phát
              hls.on(HlsClass.Events.ERROR, (event: any, data: any) => {
                // Handle audio SourceBuffer errors specifically (EAC-3/DDP codec incompatibility)
                if (data.details === 'bufferAppendingError' || data.details === 'bufferAppendError') {
                  if (data.sourceBufferName === 'audio' || (data.error && data.error.message && data.error.message.includes('audio'))) {
                    audioBufferErrorCount++;
                    if (audioBufferErrorCount <= 2) {
                      console.warn(`HLS audio buffer error #${audioBufferErrorCount}, attempting recovery...`);
                      try { hls.recoverMediaError(); } catch(e) {}
                      return;
                    }
                    if (!hasReloadedWithoutAudio) {
                      hasReloadedWithoutAudio = true;
                      console.warn('HLS audio codec incompatible (likely EAC-3/DDP 5.1), reloading without problematic audio...');
                      try {
                        hls.destroy();
                        // Recreate HLS with forced AAC audio codec preference
                        const hlsRetry = new HlsClass({
                          enableWorker: true,
                          maxBufferLength: 30,
                          maxMaxBufferLength: 60,
                          progressive: true,
                          backBufferLength: 30,
                          // Force AAC audio codec - skip incompatible EAC-3/AC-3
                          audioCodec: 'mp4a.40.2',
                        });
                        hlsRetry.loadSource(url);
                        hlsRetry.attachMedia(video);
                        hlsRetry.on(HlsClass.Events.MANIFEST_PARSED, () => {
                          video.play().catch(() => {});
                        });
                        // Suppress further audio errors on retry instance
                        hlsRetry.on(HlsClass.Events.ERROR, (_evt: any, retryData: any) => {
                          if (retryData.details === 'bufferAppendingError' || retryData.details === 'bufferAppendError') {
                            // Silently ignore on retry - audio may just not work with this file
                            return;
                          }
                          if (retryData.fatal) {
                            console.error('Fatal HLS error on retry:', retryData);
                            if (retryData.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
                              hlsRetry.recoverMediaError();
                            }
                          }
                        });
                        art.on('destroy', () => { try { hlsRetry.destroy(); } catch(e) {} });
                        art.notice.show = 'Đang tải lại video...';
                      } catch (e) {
                        console.error('Failed to reload HLS:', e);
                      }
                    }
                    // After reload attempt, suppress further errors
                    return;
                  }
                }

                if (data.fatal) {
                  switch (data.type) {
                    case HlsClass.ErrorTypes.NETWORK_ERROR:
                      console.warn('HLS Network error encountered, attempting recovery...', data);
                      hls.startLoad();
                      break;
                    case HlsClass.ErrorTypes.MEDIA_ERROR:
                      console.warn('HLS Media error encountered, attempting recovery...', data);
                      if (mediaErrorRecoveryAttempts < MAX_MEDIA_RECOVERY_ATTEMPTS) {
                        mediaErrorRecoveryAttempts++;
                        hls.recoverMediaError();
                      } else {
                        console.error('HLS Media error recovery failed after max attempts, reloading source...');
                        mediaErrorRecoveryAttempts = 0;
                        try {
                          hls.destroy();
                          const newHls = new HlsClass({
                            enableWorker: true,
                            maxBufferLength: 30,
                            maxMaxBufferLength: 60,
                          });
                          newHls.loadSource(url);
                          newHls.attachMedia(video);
                          art.on('destroy', () => { try { newHls.destroy(); } catch(e) {} });
                        } catch (e) {
                          console.error('Failed to recreate HLS:', e);
                        }
                      }
                      break;
                    default:
                      console.error('Fatal HLS error, destroying player instance:', data);
                      try {
                        art.destroy();
                      } catch (e) {}
                      break;
                  }
                } else if (data.details === 'internalException') {
                  // Suppress HLS internal exceptions (e.g. setter errors)
                  console.debug('Non-fatal HLS internal exception (suppressed)');
                } else {
                  console.debug('Non-fatal HLS error:', data.details);
                }
              });

              // Removed video.src override since blob URLs are safe and overriding .src breaks hls.js internals
              
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
                  // Use autoLevelCapping instead of maxAutoLevel (read-only in HLS.js v1.5.x)
                  hls.autoLevelCapping = maxIndex;
                  if (hls.currentLevel > maxIndex) {
                    hls.currentLevel = maxIndex;
                  }
                }

                // Add quality options to settings menu dynamically
                const levels = hls.levels;
                if (levels && levels.length > 0) {
                  try {
                    art.setting.remove('quality');
                  } catch (e) {}

                  const qualitySelector = [
                    {
                      html: 'Tự động',
                      default: true,
                      index: -1
                    },
                    ...levels.map((l: any, idx: number) => ({
                      html: l.height ? `${l.height}p` : `Chất lượng ${idx}`,
                      index: idx
                    })).reverse()
                  ];

                  // Filter selector to only show allowed qualities
                  const allowedSelector = qualitySelector.filter(item => {
                    if (item.index === -1) return true;
                    const lvl = levels[item.index];
                    return lvl && lvl.height <= maxAllowedHeight;
                  });

                  art.setting.add({
                    name: 'quality',
                    width: 150,
                    html: 'Chất lượng',
                    tooltip: 'Tự động',
                    selector: allowedSelector,
                    onSelect: function (item: any) {
                      hls.currentLevel = item.index;
                      art.notice.show = `Chất lượng: ${item.html}`;
                      return item.html;
                    }
                  });
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
                <div class="txa-watermark-wrapper" style="pointer-events: none; user-select: none; display: flex; align-items: center; background: rgba(0,0,0,0.55); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
                  <img src="/logo-icon.gif" style="height: 22px; width: auto; object-fit: contain;" />
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
          },
          // Custom subtitles portal layer
          {
            name: 'txa-subtitles-portal',
            html: '',
            style: {
              position: 'absolute',
              inset: '0',
              pointerEvents: 'none',
              zIndex: '45',
            }
          }
        ],
        controls: [
          'progress',
          // Prev Episode Button
          ...(onPrevEpisode ? [{
            name: 'prev-episode',
            position: 'left',
            index: 9,
            html: `<button class="art-icon" style="display: flex; align-items: center; justify-content: center;" title="${prevEpisode ? 'Tập trước: ' + prevEpisode.episodeName : 'Tập trước'}"><span class="material-symbols-outlined" style="font-size: 20px;">skip_previous</span></button>`,
            click: function () {
              if (onPrevEpisode) {
                onPrevEpisode();
              }
            },
          }] : []),
          {
            name: 'rewind-10',
            position: 'left',
            index: 10,
            html: `<button class="art-icon" style="display: flex; align-items: center; justify-center: center;" title="Lùi 10s"><span class="material-symbols-outlined" style="font-size: 20px;">replay_10</span></button>`,
            click: function () {
              const art = playerInstanceRef.current;
              if (art) {
                art.currentTime = Math.max(0, art.currentTime - 10);
                art.notice.show = 'Tua lại 10 giây ⏪';
              }
            },
          },
          {
            name: 'forward-10',
            position: 'left',
            index: 11,
            html: `<button class="art-icon" style="display: flex; align-items: center; justify-center: center;" title="Tua 10s"><span class="material-symbols-outlined" style="font-size: 20px;">forward_10</span></button>`,
            click: function () {
              const art = playerInstanceRef.current;
              if (art) {
                art.currentTime = Math.min(art.duration, art.currentTime + 10);
                art.notice.show = 'Tua tiếp 10 giây ⏩';
              }
            },
          },
          // Next Episode Button
          ...(onNextEpisode ? [{
            name: 'next-episode',
            position: 'left',
            index: 12,
            html: `<button class="art-icon" style="display: flex; align-items: center; justify-center: center;" title="${nextEpisode ? 'Tập tiếp theo: ' + nextEpisode.episodeName : 'Tập tiếp theo'}"><span class="material-symbols-outlined" style="font-size: 20px;">skip_next</span></button>`,
            click: function () {
              if (onNextEpisode) {
                onNextEpisode();
              }
            },
          }] : []),
          // Custom Subtitles toggle button - only show if there are subtitles
          ...(subtitles && subtitles.length > 0 ? [{
            name: 'custom-subtitles',
            position: 'right',
            index: 10,
            html: `<button class="art-icon" style="display: flex; align-items: center; justify-center: center; opacity: 0.95; transition: opacity 0.2s;" title="Phụ đề"><span class="material-symbols-outlined" style="font-size: 20px; color: #ffffff;">subtitles</span></button>`,
            click: function (_art: any) {
              const event = new CustomEvent('txa-toggle-subtitle-panel');
              window.dispatchEvent(event);
            }
          }] : [])
        ],
      };

      const art = new Artplayer(artOptions);
      
      // ... (code omitted for brevity but preserved by tool)
      // (Lines between 1892 and 2390 are preserved)


      // Error handling for video load failures
      art.on('error', (error: any) => {
        console.error('Video player error:', error);
        if (art.notice) {
          art.notice.show = 'Không thể tải video. Vui lòng thử lại hoặc chọn server khác.';
        }
        if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
          (window as any).showGlobalToast('Lỗi tải video: Link không khả dụng hoặc đã hết hạn', 'error');
        }
      });

      art.on('video:loadstart', () => {
        console.log('Video loading started');
      });

      art.on('video:loadedmetadata', () => {
        console.log('Video metadata loaded');
      });

      art.on('video:canplay', () => {
        console.log('Video can play');
      });

      // --- Menu Cài đặt (Gear icon) Tùy chỉnh thay thế toàn bộ mặc định ---

      if (qualities && qualities.length > 0) {
        art.setting.add({
          name: 'quality',
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

      // Native subtitle settings menu removed in favor of custom two-column CC panel.

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

      // Quick seek buttons overlay & Gesture double tap for mobile
      let lastTapTime = 0;
      let lastTapX = 0;
      const handleTouchEnd = (e: TouchEvent) => {
        // Only trigger if touch was on video/player area and not on controls/buttons
        const target = e.target as HTMLElement;
        if (target && (target.closest('.art-controls') || target.closest('.art-setting') || target.closest('button'))) {
          return;
        }

        const now = Date.now();
        const DOUBLE_TAP_DELAY = 350;
        const touch = e.changedTouches[0];
        if (!touch) return;

        if (now - lastTapTime < DOUBLE_TAP_DELAY && Math.abs(touch.clientX - lastTapX) < 80) {
          const container = art.template.$container;
          if (!container) return;
          
          const rect = container.getBoundingClientRect();
          const touchX = touch.clientX - rect.left;
          const width = rect.width;
          
          if (touchX < width * 0.4) {
            // Seek back 10s
            art.currentTime = Math.max(0, art.currentTime - 10);
            art.notice.show = 'Tua lại 10 giây ⏪';
          } else if (touchX > width * 0.6) {
            // Seek forward 10s
            art.currentTime = Math.min(art.duration, art.currentTime + 10);
            art.notice.show = 'Tua tiếp 10 giây ⏩';
          } else {
            // Center tap: toggle play/pause
            if (art.playing) art.pause();
            else art.play();
          }
          e.preventDefault();
        }
        lastTapTime = now;
        lastTapX = touch.clientX;
      };

      const playerContainer = art.template.$container;
      if (playerContainer) {
        playerContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
      }

      // 7. Disable keyboard shortcuts for download (Ctrl+S, Ctrl+U) & Global Player Hotkeys (Desktop)
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (!playerInstanceRef.current) return;
        const art = playerInstanceRef.current;

        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) {
          e.preventDefault();
          e.stopPropagation();
          art.notice.show = '⛔ Tải xuống bị vô hiệu hóa';
          return;
        }

        // Bỏ qua hotkey nếu đang gõ vào input, textarea hoặc contenteditable
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
          return;
        }

        // Xử lý các phím tắt phổ biến trên máy tính
        const key = (e.key || '').toLowerCase();
        const code = e.code;

        if (code === 'Space' || key === 'k') {
          e.preventDefault();
          if (art.playing) art.pause();
          else art.play();
        } else if (code === 'ArrowLeft' || key === 'j') {
          e.preventDefault();
          art.currentTime = Math.max(0, art.currentTime - 5);
          art.notice.show = 'Tua lại 5 giây ⏪';
        } else if (code === 'ArrowRight' || key === 'l') {
          e.preventDefault();
          art.currentTime = Math.min(art.duration, art.currentTime + 5);
          art.notice.show = 'Tua tiếp 5 giây ⏩';
        } else if (code === 'ArrowUp') {
          e.preventDefault();
          art.volume = Math.min(1, art.volume + 0.1);
          art.notice.show = `Âm lượng: ${Math.round(art.volume * 100)}% 🔊`;
        } else if (code === 'ArrowDown') {
          e.preventDefault();
          art.volume = Math.max(0, art.volume - 0.1);
          art.notice.show = `Âm lượng: ${Math.round(art.volume * 100)}% 🔉`;
        } else if (key === 'm') {
          e.preventDefault();
          art.muted = !art.muted;
          art.notice.show = art.muted ? 'Tắt tiếng 🔇' : 'Bật tiếng 🔊';
        } else if (key === 'f') {
          e.preventDefault();
          art.fullscreen = !art.fullscreen;
        }
      };

      window.addEventListener('keydown', handleGlobalKeyDown, true);

      const injectRangeHighlights = () => {
        const container = art.template.$container;
        if (!container) return;
        const progressBar = container.querySelector('.art-progress') as HTMLElement;
        if (!progressBar) return;
        const duration = art.duration;
        if (!duration || duration <= 0) return;

        progressBar.querySelectorAll('.txa-range-highlight').forEach(el => el.remove());

        if (timeIntroStart > 0 && timeIntroEnd > 0 && timeIntroEnd > timeIntroStart && timeIntroEnd <= duration) {
          const left = (timeIntroStart / duration) * 100;
          const w = ((timeIntroEnd - timeIntroStart) / duration) * 100;
          const el = document.createElement('div');
          el.className = 'txa-range-highlight txa-range-highlight-intro';
          el.style.cssText = `position:absolute;left:${left}%;width:${w}%;`;
          progressBar.appendChild(el);
        }
        if (timeOutroStart > 0 && timeOutroStart < duration) {
          const left = (timeOutroStart / duration) * 100;
          const w = ((duration - timeOutroStart) / duration) * 100;
          const el = document.createElement('div');
          el.className = 'txa-range-highlight txa-range-highlight-outro';
          el.style.cssText = `position:absolute;left:${left}%;width:${w}%;`;
          progressBar.appendChild(el);
        }
      };

      art.on('ready', () => {
        (art as any).isFocus = true;

        // Fix SPA View Transitions: controls bị ẩn khi ArtPlayer khởi tạo
        // trong lúc transition animation chưa xong → re-focus sau khi trang load xong
        handlePageLoad = () => {
          if (art && !(art as any).destroyed) {
            (art as any).isFocus = true;
            window.dispatchEvent(new Event('resize'));
          }
        };
        document.addEventListener('astro:page-load', handlePageLoad);

        // Set the portal container element for custom subtitles React render
        const portalEl = art.template.$container.querySelector('.art-layer-txa-subtitles-portal') as HTMLElement;
        if (portalEl) {
          setPortalContainer(portalEl);
        }

        injectRangeHighlights();

        if (currentTime > 0) {
          art.currentTime = currentTime;
          art.notice.show = `Đã khôi phục tiến trình xem: ${Math.floor(currentTime / 60)} phút ${Math.floor(currentTime % 60)} giây`;
        }
        if (onPlayerReady) {
          onPlayerReady(() => art.currentTime || 0);
        }

        // === ANTI-DOWNLOAD / ANTI-M3U8-CAPTURE PROTECTION ===
        try {
          const videoEl = art.template.$video;
          if (videoEl) {
            // 1. Block right-click context menu on video element
            videoEl.addEventListener('contextmenu', (e: Event) => e.preventDefault());
            // 2. Prevent removing src/crossorigin as it resets video element load state
            // 3. Prevent drag on video
            videoEl.setAttribute('draggable', 'false');
            videoEl.addEventListener('dragstart', (e: Event) => e.preventDefault());
          }

          // 4. Override video.src getter to return empty for sniffer extensions
          const container = art.template.$container;
          if (container) {
            const observer = new MutationObserver(() => {
              const sources = container.querySelectorAll('source');
              sources.forEach((s: Element) => s.remove());
            });
            observer.observe(container, { childList: true, subtree: true });
            art.on('destroy', () => observer.disconnect());
          }

          // 5. Intercept XMLHttpRequest removed since checking stack traces for extensions breaks playback on browsers with active extensions

          // 6. Wrap navigator.mediaDevices to prevent screen capture
          if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            const origGetDisplay = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
            navigator.mediaDevices.getDisplayMedia = function() {
              return Promise.reject(new DOMException('Screen capture is disabled.', 'NotAllowedError'));
            };
          }
        } catch (antiDlErr) {
          console.warn('Anti-download init error:', antiDlErr);
        }
      });

      // Keep focus on hover and play so hotkeys always work
      art.on('hover', (state: boolean) => {
        if (state) (art as any).isFocus = true;
      });
      art.on('play', () => {
        (art as any).isFocus = true;
      });

      let lastUpdatedTime = 0;
      let hasAutoSkippedIntro = false;
      let hasAutoSkippedOutro = false;

      art.on('video:timeupdate', () => {
        const now = art.currentTime;
        const duration = art.duration;

        if (timeIntroEnd > 0 && timeIntroEnd > timeIntroStart) {
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

          // Show next episode popup when auto next is enabled (skip if auto-skip-outro already triggered)
          if (autoNextEpisode && nextEpisode && !popupShownRef.current && now >= timeOutroStart && !hasAutoSkippedOutro) {
            popupShownRef.current = true;
            setShowNextEpisodePopup(true);
            setCountdown(5);
            
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            
            countdownRef.current = setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                  }
                  if (onNextEpisode) {
                    setShowSwitchingToast(true);
                    onNextEpisode();
                    setTimeout(() => setShowSwitchingToast(false), 2500);
                  }
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
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
        if (handlePageLoad) {
          document.removeEventListener('astro:page-load', handlePageLoad);
        }
        window.removeEventListener('txa-autoskip-changed', handleAutoSkipEvent);
        window.removeEventListener('keydown', handleGlobalKeyDown, true);
        if (playerContainer) {
          playerContainer.removeEventListener('touchend', handleTouchEnd);
        }
      });
    };

    let active = true;
    let checkInterval: any = null;

    const startInit = async () => {
      if (!active) return;

      if (realUrl.includes('.m3u8') || realUrl.includes('stream')) {
        if ((window as any).Hls) {
          initPlayer((window as any).Hls);
        } else {
          let script = document.querySelector('script[src*="hls.min.js"]') as HTMLScriptElement;
          if (!script) {
            script = document.createElement('script');
            script.id = 'hls-js-script';
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.8/hls.min.js';
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
        }
      } else {
        initPlayer(null);
      }
    };

    startInit();

    return () => {
      active = false;
      setPortalContainer(null);
      if (playerInstanceRef.current) {
        try {
          const oldArt = playerInstanceRef.current;
          if (oldArt.video) {
            oldArt.video.pause();
            oldArt.video.removeAttribute('src');
            try { oldArt.video.load(); } catch (e) {}
          }
        } catch (e) {}
        try {
          playerInstanceRef.current.destroy(false);
        } catch (e) {}
      }
      if (artRef.current) {
        artRef.current.innerHTML = '';
      }
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [url, title, storyboardUrl, subtitles, nextEpisode, onNextEpisode, prevEpisode, onPrevEpisode]);

  return (
    <div className="relative w-full h-full">
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
        .art-control-progress .art-progress {
          height: 8px !important;
          border-radius: 4px !important;
          transition: height 0.15s ease !important;
        }
        .art-mobile .art-control-progress .art-progress {
          height: 10px !important;
        }
        .art-control-progress:hover .art-progress {
          height: 12px !important;
        }
        .art-mobile .art-mini-progress-bar {
          height: 3px !important;
          opacity: 1 !important;
        }
        .art-mobile .art-mini-progress-bar .art-mini-progress-inner {
          background: #1e88e5 !important;
        }
        .art-control-progress .txa-range-highlight {
          height: 100% !important;
          top: 0 !important;
          border-radius: 4px !important;
          pointer-events: none !important;
          z-index: 3 !important;
        }
        .art-control-progress .txa-range-highlight-intro {
          background: rgba(30, 136, 229, 0.35) !important;
          box-shadow: inset 0 0 8px rgba(30, 136, 229, 0.2) !important;
          border: 1px solid rgba(30, 136, 229, 0.3) !important;
        }
        .art-control-progress .txa-range-highlight-outro {
          background: rgba(239, 68, 68, 0.35) !important;
          box-shadow: inset 0 0 8px rgba(239, 68, 68, 0.2) !important;
          border: 1px solid rgba(239, 68, 68, 0.3) !important;
        }
        .art-control-progress .art-progress-highlight {
          width: 6px !important;
          height: 16px !important;
          border-radius: 3px !important;
          margin-top: -6px !important;
          box-shadow: 0 0 14px rgba(30, 136, 229, 0.9), 0 0 4px rgba(30, 136, 229, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
          background: #60a5fa !important;
          z-index: 10 !important;
        }
        .art-control-progress .art-progress-highlight:hover {
          transform: scaleY(1.5) !important;
        }
        .art-control-progress .art-progress-highlight:nth-child(2) {
          box-shadow: 0 0 14px rgba(251, 191, 36, 0.9), 0 0 4px rgba(251, 191, 36, 0.6) !important;
          background: #fbbf24 !important;
        }
        .art-control-progress .art-progress-highlight:nth-child(3) {
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.9), 0 0 4px rgba(239, 68, 68, 0.6) !important;
          background: #f87171 !important;
        }
        .art-control-progress:hover .art-progress-highlight {
          height: 20px !important;
          margin-top: -9px !important;
        }
        @keyframes switchSlideUp {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes switchFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
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
      
      {showNextEpisodePopup && nextEpisode && (
        <div className="absolute z-50 pointer-events-none" style={{ inset: 0 }}>
          {typeof window !== 'undefined' && window.innerWidth < 768 ? (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0B0A0C]/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl pointer-events-auto">
              <div className="text-white text-xs font-bold">Tập tiếp theo: {nextEpisode.episodeName}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 text-[10px]">Tự động sau</span>
                <span className="text-white text-sm font-black min-w-[18px] text-center tabular-nums">{countdown}</span>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-20 right-6 bg-[#0B0A0C]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-[340px] pointer-events-auto">
              <div className="flex gap-4">
                <div className="relative w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800 shadow-lg">
                  <img src={nextEpisode.thumbnail} alt={nextEpisode.episodeName} className="w-full h-full object-cover" />
                  <div className="absolute bottom-1.5 left-1.5 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow">{nextEpisode.episodeName}</div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-white text-sm font-bold truncate">{nextEpisode.title}</h4>
                    <p className="text-zinc-400 text-[11px] truncate mt-0.5">{nextEpisode.episodeName}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-zinc-500 text-[10px]">Tự động sau</span>
                      <span className="text-white text-2xl font-black min-w-[28px] text-center tabular-nums leading-none">{countdown}</span>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <button onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); setShowSwitchingToast(true); if (onNextEpisode) onNextEpisode(); setTimeout(() => setShowSwitchingToast(false), 2500); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 px-3 rounded-xl transition-all cursor-pointer border-none active:scale-95">Chuyển ngay</button>
                      <button onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); setShowNextEpisodePopup(false); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold py-2 px-3 rounded-xl transition-all cursor-pointer border-none active:scale-95">Bỏ qua</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showSwitchingToast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none" style={{ animation: 'switchSlideUp 0.3s ease-out' }}>
          <div className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 whitespace-nowrap">
            <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            Đang chuyển sang tập tiếp theo...
          </div>
        </div>
      )}

      {portalContainer && playerInstanceRef.current && createPortal(
        <CustomSubtitleSystem art={playerInstanceRef.current} subtitles={subtitles} />,
        portalContainer
      )}
    </div>
  );
};