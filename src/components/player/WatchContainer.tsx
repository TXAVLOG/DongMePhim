import React, { useState, useEffect, useRef } from 'react';
import { ArtPlayer } from './ArtPlayer';
import type { MovieDetail, Episode } from '../../types/movie';
import { TxaModal } from '../ui/txamodal';
import { supabase } from '../../lib/supabase';

const formatLocalAirDateTime = (dateStr?: string, timeStr?: string) => {
  if (!dateStr) return { date: '', time: '', text: '' };
  let isoStr = `${dateStr}T00:00:00Z`;
  if (timeStr) {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      isoStr = `${dateStr}T${timeStr}:00Z`;
    } else {
      isoStr = `${dateStr}T${timeStr}Z`;
    }
  }
  try {
    const d = new Date(isoStr);
    const localHours = String(d.getHours()).padStart(2, '0');
    const localMinutes = String(d.getMinutes()).padStart(2, '0');
    const localDay = String(d.getDate()).padStart(2, '0');
    const localMonth = String(d.getMonth() + 1).padStart(2, '0');
    const localYear = d.getFullYear();
    
    const formattedDate = `${localDay}-${localMonth}-${localYear}`;
    const formattedTime = timeStr ? `${localHours}:${localMinutes}` : '';
    
    return {
      date: formattedDate,
      time: formattedTime,
      text: timeStr ? `${formattedTime} ngày ${formattedDate}` : `ngày ${formattedDate}`
    };
  } catch (e) {
    return {
      date: dateStr,
      time: timeStr || '',
      text: timeStr ? `${timeStr} ngày ${dateStr}` : `ngày ${dateStr}`
    };
  }
};

const CountdownBadge: React.FC<{ date: string; time?: string; label: string }> = ({ date, time, label }) => {
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');
  const hasTime = !!time;

  useEffect(() => {
    if (!hasTime) return;
    
    let targetDateTimeStr = `${date}T00:00:00Z`;
    if (time) {
      const parts = time.split(':');
      if (parts.length === 2) {
        targetDateTimeStr = `${date}T${time}:00Z`;
      } else {
        targetDateTimeStr = `${date}T${time}Z`;
      }
    }
    const targetDate = new Date(targetDateTimeStr).getTime();
    
    const update = () => {
      const now = Date.now();
      const diff = targetDate - now;
      
      if (diff <= 0) {
        setTimeLeft('Đã phát sóng!');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      let displayStr = '';
      if (days > 0) displayStr += `${days.toString().padStart(2, '0')}d `;
      displayStr += `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
      
      setTimeLeft(displayStr);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [date, time, hasTime]);

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-[#2563eb] via-[#8b5cf6] to-[#ec4899] rounded-2xl text-xs text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(139,92,246,0.25)] relative overflow-hidden w-full">
      <div className="flex items-center gap-3 relative z-10">
        <div className="bg-black/35 w-10 h-10 rounded-full flex items-center justify-center border border-white/10 shrink-0">
          <span className="material-symbols-outlined text-xl text-yellow-400">notifications</span>
        </div>
        <div>
          <span className="font-bold text-[14px] leading-tight block">
            {label}
          </span>
        </div>
      </div>
      
      {hasTime && (
        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shrink-0 relative z-10 flex flex-col items-start sm:items-end justify-center">
          <span className="text-[9px] text-white/60 block uppercase font-bold tracking-wider mb-0.5">Đếm ngược phát sóng</span>
          <span className="font-mono text-[14px] font-black text-yellow-300">{timeLeft}</span>
        </div>
      )}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/5 to-transparent pointer-events-none"></div>
    </div>
  );
};

const UnreleasedPlayerPlaceholder: React.FC<{ episode: Episode }> = ({ episode }) => {
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');
  const hasTime = !!episode.airTime;

  useEffect(() => {
    if (!episode.airDate) return;
    
    let targetDateTimeStr = `${episode.airDate}T00:00:00Z`;
    if (episode.airTime) {
      const parts = episode.airTime.split(':');
      if (parts.length === 2) {
        targetDateTimeStr = `${episode.airDate}T${episode.airTime}:00Z`;
      } else {
        targetDateTimeStr = `${episode.airDate}T${episode.airTime}Z`;
      }
    }
    const targetDate = new Date(targetDateTimeStr).getTime();
    
    const update = () => {
      const now = Date.now();
      const diff = targetDate - now;
      
      if (diff <= 0) {
        setTimeLeft('Đã đến giờ phát sóng!');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      let displayStr = '';
      if (days > 0) displayStr += `${days.toString().padStart(2, '0')} ngày `;
      displayStr += `${hours.toString().padStart(2, '0')} giờ ${minutes.toString().padStart(2, '0')} phút ${seconds.toString().padStart(2, '0')} giây`;
      
      setTimeLeft(displayStr);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [episode, hasTime]);

  const local = formatLocalAirDateTime(episode.airDate, episode.airTime);

  return (
    <div className="w-full h-full aspect-video bg-zinc-950/80 border border-glass-stroke rounded-2xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-primary/5 blur-[50px] pointer-events-none"></div>
      
      <div className="relative z-10 space-y-6 max-w-lg">
        <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-primary/20 shadow-[0_0_30px_rgba(124,58,237,0.2)]">
          <span className="material-symbols-outlined text-3xl text-primary animate-pulse">lock</span>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-display-hero text-2xl font-black text-white tracking-wide uppercase">Tập phim chưa phát sóng</h3>
          <p className="text-sm text-zinc-400 leading-relaxed font-body-main">
            Tập phim <span className="text-primary font-bold">{episode.name}</span> dự kiến sẽ phát sóng vào <span className="text-white font-bold">{local.text}</span>. Các bạn vui lòng quay lại sau nhé!
          </p>
        </div>

        {hasTime && (
          <div className="bg-zinc-900/60 border border-glass-stroke/50 p-5 rounded-2xl backdrop-blur-md space-y-2 max-w-sm mx-auto shadow-inner">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block font-bold">Đồng hồ đếm ngược</span>
            <span className="text-lg md:text-xl font-mono font-black text-yellow-400 block tracking-wider">{timeLeft}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface WatchContainerProps {
  movie: MovieDetail;
  initialEpisodeSlug?: string;
  initialServerIndex?: number;
  relatedMovies: any[];
  isUnreleased?: boolean;
  unreleasedEpisode?: Episode | null;
  nextAiringEpisode?: Episode | null;
  siteName?: string;
  siteUrl?: string;
}

interface HistoryItem {
  slug: string;
  episodeSlug: string;
  episodeName: string;
  currentTime: number;
  duration: number;
  serverIndex: number;
  serverName: string;
  updatedAt: string;
  synced: boolean;
  title?: string;
  posterUrl?: string;
}

const findEpisodeIndexBySlug = (serverData: any[], targetSlug?: string): number => {
  if (!targetSlug || !serverData || serverData.length === 0) return 0;
  
  let idx = serverData.findIndex(ep => ep.slug === targetSlug);
  if (idx !== -1) return idx;

  const normalizeSlug = (s: string) => {
    return s.toLowerCase().replace(/^(tap|tập|ep|episode|ep-|-)+/g, '').trim();
  };
  const normTarget = normalizeSlug(targetSlug);
  idx = serverData.findIndex(ep => normalizeSlug(ep.slug) === normTarget);
  if (idx !== -1) return idx;

  const extractNum = (str: string) => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };
  const targetNum = extractNum(targetSlug);
  if (targetNum !== null) {
    idx = serverData.findIndex(ep => extractNum(ep.slug) === targetNum);
    if (idx !== -1) return idx;
    
    idx = serverData.findIndex(ep => {
      const epNum = extractNum(ep.name);
      return epNum === targetNum;
    });
    if (idx !== -1) return idx;
  }

  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTarget = clean(targetSlug);
  idx = serverData.findIndex(ep => {
    const cleanEp = clean(ep.slug);
    return cleanEp === cleanTarget || cleanEp.includes(cleanTarget) || cleanTarget.includes(cleanEp);
  });
  if (idx !== -1) return idx;

  return 0;
};

const RatingWidget: React.FC<{ movieSlug: string }> = ({ movieSlug }) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const fetchRating = async () => {
      if (typeof window === 'undefined') return;
      const username = (window.APP_USER ? window.APP_USER.username : null) || '';
      try {
        const res = await fetch(`/api/user/rating?slug=${encodeURIComponent(movieSlug)}&username=${encodeURIComponent(username)}`);
        if (res.ok && active) {
          const result: any = await res.json();
          if (result && result.status === 'success' && result.data) {
            setRating(result.data.userRating || 0);
            setAvgRating(result.data.averageRating || 0);
            setTotalRatings(result.data.totalRatings || 0);
          }
        }
      } catch (err) {
        console.error('Lỗi khi fetch rating:', err);
      }
    };
    fetchRating();
    return () => { active = false; };
  }, [movieSlug]);

  const handleRating = async (val: number) => {
    if (typeof window === 'undefined') return;
    const username = (window.APP_USER ? window.APP_USER.username : null);
    if (!username) {
      if ((window as any).showGlobalToast) {
        (window as any).showGlobalToast('Vui lòng đăng nhập để đánh giá phim!', 'error');
      }
      setTimeout(() => {
        if ((window as any).openLoginModal) {
          (window as any).openLoginModal();
        }
      }, 800);
      return;
    }

    try {
      const res = await fetch('/api/user/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          slug: movieSlug,
          rating: val
        })
      });
      if (res.ok) {
        const result: any = await res.json();
        if (result && result.status === 'success' && result.data) {
          setRating(result.data.userRating);
          setAvgRating(result.data.averageRating);
          setTotalRatings(result.data.totalRatings);
          if ((window as any).showGlobalToast) {
            (window as any).showGlobalToast(`Cảm ơn bạn đã đánh giá ${val}/10 sao!`, 'success');
          }
        } else {
          throw new Error(result.message || 'Lỗi server');
        }
      } else {
        throw new Error('Lỗi kết nối mạng');
      }
    } catch (err: any) {
      if ((window as any).showGlobalToast) {
        (window as any).showGlobalToast(`Lỗi: ${err.message}`, 'error');
      }
    }
  };

  return (
    <div className="glass-card bg-surface-card border border-glass-stroke rounded-2xl p-5 shadow-xl space-y-4">
      <h3 className="text-white font-title-md flex items-center gap-2 font-bold text-sm">
        <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
        Đánh Giá Phim
      </h3>
      <div className="flex flex-col items-center justify-center py-4 bg-zinc-900/40 rounded-xl border border-glass-stroke/40 space-y-2">
        <div className="text-3xl font-black text-white font-mono">
          {rating > 0 ? `${rating}.0` : `${avgRating}`}
          <span className="text-zinc-500 text-sm font-normal font-sans">/10</span>
        </div>
        <p className="text-[10px] text-zinc-400 font-medium">({totalRatings} lượt đánh giá)</p>
        
        <div className="flex items-center gap-1 pt-2">
          {Array.from({ length: 10 }).map((_, i) => {
            const val = i + 1;
            const isFilled = hoverRating >= val || (!hoverRating && rating >= val);
            return (
              <button
                key={val}
                type="button"
                onMouseEnter={() => setHoverRating(val)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => handleRating(val)}
                className="focus:outline-none cursor-pointer transition-transform hover:scale-125 bg-transparent border-none p-0 flex"
              >
                <span 
                  className={`material-symbols-outlined text-lg ${isFilled ? 'text-yellow-400' : 'text-zinc-600'}`}
                  style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[9px] text-zinc-500 pt-1">Di chuột và nhấp chọn từ 1 - 10 sao</p>
      </div>
    </div>
  );
};

const DiscordBanner: React.FC = () => {
  const settings = (typeof window !== 'undefined' ? (window as any).TXA_SITE_SETTINGS : null) || {};
  const showDiscord = settings.social?.social_discord_enable && settings.social?.social_discord_url;
  
  if (!showDiscord) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#5865F2] via-[#404eed] to-[#5865F2] p-5 text-white shadow-xl group border border-[#404eed]/40">
      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
      <div className="absolute -left-10 -top-10 w-24 h-24 bg-black/10 rounded-full blur-lg"></div>

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1,.07,2,.15,3,.21a72.82,72.82,0,0,0,72,0c1-.06,2-.14,3-.21a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.06-18.83C129,54.65,123.5,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
          </svg>
          <span className="font-headline font-black text-sm uppercase tracking-widest">GIA NHẬP DISCORD</span>
        </div>
        <p className="text-[11px] text-white/80 leading-relaxed font-body-main">
          Tham gia cộng đồng để chém gió cùng các mọt phim, đóng góp ý kiến và nhận thông báo phát sóng tập mới sớm nhất!
        </p>
        <a 
          href={settings.social?.social_discord_url || "https://discord.gg"} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-2 w-full py-2 bg-white text-[#5865F2] hover:bg-white/95 transition-all text-xs font-bold rounded-xl text-center shadow-lg active:scale-95 flex items-center justify-center gap-1.5 border-none decoration-none no-underline"
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          Tham gia ngay
        </a>
      </div>
    </div>
  );
};

const ActorsList: React.FC<{ actors?: string[] }> = ({ actors = [] }) => {
  if (!actors || actors.length === 0) return null;

  const getGradientByName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const colors = [
      'from-purple-500 to-indigo-500',
      'from-pink-500 to-rose-500',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-amber-500 to-orange-500',
      'from-violet-500 to-fuchsia-500'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="glass-card bg-surface-card border border-glass-stroke rounded-2xl p-5 shadow-xl space-y-4">
      <h3 className="text-white font-title-md flex items-center gap-2 font-bold text-sm">
        <span className="material-symbols-outlined text-primary">theater_comedy</span>
        Diễn Viên
      </h3>
      <div className="flex flex-wrap gap-4 items-center justify-start">
        {actors.map(actor => {
          const nameTrimmed = actor.trim();
          const firstLetter = nameTrimmed.charAt(0).toUpperCase();
          const gradient = getGradientByName(nameTrimmed);

          return (
            <div key={actor} className="flex flex-col items-center justify-center w-[60px] text-center gap-1 group">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-sm border-2 border-white/10 shadow-md group-hover:scale-105 transition-transform duration-300`}>
                {firstLetter}
              </div>
              <span className="text-[9px] text-zinc-400 font-medium line-clamp-2 w-full leading-tight group-hover:text-white transition-colors" data-txatooltip={nameTrimmed}>
                {nameTrimmed}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CollapsibleDescription: React.FC<{ htmlContent: string }> = ({ htmlContent }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldShowButton, setShouldShowButton] = useState<boolean>(false);

  useEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.scrollHeight > 100) {
        setShouldShowButton(true);
      }
    }
  }, [htmlContent]);

  return (
    <div className="glass-card bg-surface-card border border-glass-stroke rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
      <h3 className="text-white font-title-md flex items-center gap-2 font-bold text-sm">
        <span className="material-symbols-outlined text-primary">description</span>
        Mô Tả Phim
      </h3>
      <div 
        ref={contentRef}
        className={`text-xs text-zinc-300 leading-relaxed font-body-main transition-all duration-500 overflow-hidden relative ${
          !isExpanded && shouldShowButton ? 'max-h-24 pb-4' : 'max-h-[2000px] pb-2'
        }`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      {!isExpanded && shouldShowButton && (
        <div className="absolute bottom-12 left-0 right-0 h-10 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent pointer-events-none"></div>
      )}
      {shouldShowButton && (
        <div className="flex justify-center pt-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-4 py-1.5 bg-white/5 border border-glass-stroke text-zinc-300 rounded-xl text-[10px] font-bold uppercase hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>Thu gọn</span>
                <span className="material-symbols-outlined text-xs">keyboard_arrow_up</span>
              </>
            ) : (
              <>
                <span>Đọc thêm</span>
                <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

interface ReplyItem {
  id: any;
  author: string;
  content: string;
  createdAt: string;
}

interface CommentItem {
  id: any;
  author: string;
  content: string;
  likes: number;
  dislikes: number;
  replies: ReplyItem[];
  createdAt: string;
}

const CommentSystem: React.FC<{ movieSlug: string }> = ({ movieSlug }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');
  const [replyTarget, setReplyTarget] = useState<any | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/comments?slug=${encodeURIComponent(movieSlug)}`);
        if (res.ok) {
          const result: any = await res.json();
          if (result && result.status === 'success' && Array.isArray(result.data)) {
            setComments(result.data);
          }
        }
      } catch (e) {
        console.error('Lỗi khi tải bình luận từ Supabase:', e);
      }
    };

    fetchComments();

    if (typeof window !== 'undefined') {
      const loggedIn = (window.APP_USER ? window.APP_USER.username : null);
      if (loggedIn) {
        setAuthorName(loggedIn);
      }
    }
  }, [movieSlug]);

  const handlePostComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const name = authorName.trim() || 'Ẩn danh';

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slug: movieSlug,
          author: name,
          content: newComment.trim()
        })
      });

      if (res.ok) {
        const result: any = await res.json();
        if (result && result.status === 'success' && result.data) {
          setComments(prev => [result.data, ...prev]);
          setNewComment('');
          if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
            (window as any).showGlobalToast('Đăng bình luận thành công!', 'success');
          }
        } else {
          throw new Error(result.message || 'Lỗi server');
        }
      } else {
        throw new Error('Lỗi kết nối mạng');
      }
    } catch (err: any) {
      if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
        (window as any).showGlobalToast(`Lỗi: ${err.message}`, 'error');
      }
    }
  };

  const handlePostReply = async (commentId: any) => {
    if (!replyContent.trim()) return;

    const name = authorName.trim() || 'Ẩn danh';

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reply',
          commentId: commentId,
          replyAuthor: name,
          replyContent: replyContent.trim()
        })
      });

      if (res.ok) {
        const result: any = await res.json();
        if (result && result.status === 'success' && result.data) {
          const replyRecord = result.data;
          setComments(prev => prev.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                replies: [...c.replies, replyRecord]
              };
            }
            return c;
          }));
          setReplyContent('');
          setReplyTarget(null);
          if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
            (window as any).showGlobalToast('Đã trả lời bình luận!', 'success');
          }
        } else {
          throw new Error(result.message || 'Lỗi server');
        }
      } else {
        throw new Error('Lỗi kết nối mạng');
      }
    } catch (err: any) {
      if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
        (window as any).showGlobalToast(`Lỗi: ${err.message}`, 'error');
      }
    }
  };

  const handleLike = async (commentId: any, isDislike: boolean = false) => {
    if (isDislike) {
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, dislikes: c.dislikes + 1 };
        }
        return c;
      }));
      return;
    }

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'like',
          commentId: commentId
        })
      });

      if (res.ok) {
        const result: any = await res.json();
        if (result && result.status === 'success' && result.data) {
          const newLikes = result.data.likes;
          setComments(prev => prev.map(c => {
            if (c.id === commentId) {
              return { ...c, likes: newLikes };
            }
            return c;
          }));
        }
      }
    } catch (err) {
      console.error('Lỗi khi thích bình luận:', err);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch (e) {
      return 'Vừa xong';
    }
  };

  return (
    <div className="glass-card bg-surface-card border border-glass-stroke rounded-2xl p-5 shadow-xl space-y-6">
      <h3 className="text-white font-title-md flex items-center gap-2 font-bold text-sm">
        <span className="material-symbols-outlined text-primary">forum</span>
        Bình Luận ({comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)})
      </h3>

      <form onSubmit={handlePostComment} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Tên của bạn..."
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="md:col-span-1 bg-surface border border-glass-stroke rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-white font-semibold"
          />
          <textarea
            rows={3}
            placeholder="Nhập nội dung bình luận tại đây..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="md:col-span-3 bg-surface border border-glass-stroke rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-white"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 bg-primary text-slate-950 rounded-xl text-xs font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 border-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            Đăng bình luận
          </button>
        </div>
      </form>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {comments.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ!</p>
        ) : (
          comments.map(c => {
            const isModerator = c.author.toLowerCase().includes('cô 3 rổ') || c.author.toLowerCase().includes('admin');
            const initial = c.author.substring(0, 1).toUpperCase();

            const getPlanByPackageNameOrId = (pkgNameOrId?: string) => {
              if (typeof window === 'undefined') return { id: 'free', title: 'Gói Free' };
              const settings = (window as any).TXA_SITE_SETTINGS || {};
              const packages = settings.packages || [];
              const normalized = (pkgNameOrId || 'free').toLowerCase().trim();
              let plan = packages.find((p: any) => p.id.toLowerCase() === normalized);
              if (plan) return plan;
              plan = packages.find((p: any) => p.title.toLowerCase() === normalized);
              if (plan) return plan;
              if (normalized === 'free' || normalized === 'gói free') {
                return { id: 'free', title: 'Gói Free' };
              }
              return { id: 'free', title: pkgNameOrId || 'Gói Free' };
            };

            const plan = getPlanByPackageNameOrId((c as any).package);
            const pkgId = plan.id;
            const pkgTitle = plan.title;

            return (
              <div key={c.id} className="border-b border-glass-stroke/30 pb-4 last:border-none space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full ${isModerator ? 'bg-pink-500' : 'bg-zinc-700'} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow`}>
                    {initial}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isModerator ? 'text-pink-400' : `package-style-${pkgId}`}`}>
                        {c.author}
                      </span>
                      {!isModerator && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded bg-white/5 border border-glass-stroke/50 package-style-${pkgId}`}>
                          {pkgTitle}
                        </span>
                      )}
                      {isModerator && (
                        <span className="bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider scale-90">
                          Admin
                        </span>
                      )}
                      <span className="text-[9px] text-zinc-500">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-zinc-300 font-body-main leading-relaxed">{c.content}</p>
                    
                    <div className="flex items-center gap-4 text-[10px] text-zinc-500 pt-1">
                      <button 
                        type="button"
                        onClick={() => handleLike(c.id)}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 text-zinc-500"
                      >
                        <span className="material-symbols-outlined text-[12px]">thumb_up</span>
                        <span>{c.likes}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleLike(c.id, true)}
                        className="flex items-center gap-1 hover:text-rose-400 transition-colors cursor-pointer bg-transparent border-none p-0 text-zinc-500"
                      >
                        <span className="material-symbols-outlined text-[12px]">thumb_down</span>
                        <span>{c.dislikes}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setReplyTarget(replyTarget === c.id ? null : c.id)}
                        className="flex items-center gap-1 hover:text-secondary transition-colors cursor-pointer bg-transparent border-none p-0 text-zinc-500"
                      >
                        <span className="material-symbols-outlined text-[12px]">reply</span>
                        <span>Trả lời</span>
                      </button>
                    </div>
                  </div>
                </div>

                {replyTarget === c.id && (
                  <div className="ml-11 flex gap-2 items-center bg-zinc-950/40 p-2.5 rounded-xl border border-glass-stroke/50">
                    <input 
                      type="text" 
                      placeholder="Viết câu trả lời..." 
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="flex-1 bg-surface border border-glass-stroke rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-white"
                    />
                    <button 
                      type="button"
                      onClick={() => handlePostReply(c.id)}
                      className="px-3 py-1.5 bg-primary text-slate-950 rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 border-none cursor-pointer"
                    >
                      Gửi
                    </button>
                  </div>
                )}

                {c.replies.length > 0 && (
                  <div className="ml-11 pl-3 border-l-2 border-primary/20 space-y-3 pt-2">
                    {c.replies.map((r: ReplyItem) => {
                      const isRepModerator = r.author.toLowerCase().includes('cô 3 rổ') || r.author.toLowerCase().includes('admin');
                      const repInitial = r.author.substring(0, 1).toUpperCase();
                      const repPlan = getPlanByPackageNameOrId((r as any).package);
                      const repPkgId = repPlan.id;
                      const repPkgTitle = repPlan.title;

                      return (
                        <div key={r.id} className="flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
                          <div className={`w-6.5 h-6.5 rounded-full ${isRepModerator ? 'bg-pink-500' : 'bg-zinc-700'} flex items-center justify-center text-white font-bold text-[10px] shrink-0`}>
                            {repInitial}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[11px] font-bold ${isRepModerator ? 'text-pink-400' : `package-style-${repPkgId}`}`}>
                                {r.author}
                              </span>
                              {!isRepModerator && (
                                <span className={`text-[7px] font-bold px-1.2 py-0.2 rounded bg-white/5 border border-glass-stroke/50 package-style-${repPkgId}`}>
                                  {repPkgTitle}
                                </span>
                              )}
                              {isRepModerator && (
                                <span className="bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded px-1 py-0.2 text-[7px] font-bold uppercase tracking-wider scale-90">
                                  Admin
                                </span>
                              )}
                              <span className="text-[8px] text-zinc-500">{formatDate(r.createdAt)}</span>
                            </div>
                            <p className="text-xs text-zinc-300 font-body-main leading-relaxed">{r.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const WatchContainer: React.FC<WatchContainerProps> = ({
  movie: initialMovie,
  initialEpisodeSlug,
  initialServerIndex = 0,
  relatedMovies,
  isUnreleased = false,
  unreleasedEpisode = null,
  nextAiringEpisode = null,
  siteName = '',
  siteUrl = ''
}) => {
  const [movie, setMovie] = useState<MovieDetail>(initialMovie);
  const servers = movie.episodes || [];
  
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('Không load được video');
  const [customReason, setCustomReason] = useState<string>('');
  const [isReporting, setIsReporting] = useState<boolean>(false);

  const handleReportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsReporting(true);

    const reasonSelected = reportReason === 'Khác' ? customReason.trim() : reportReason;
    if (reportReason === 'Khác' && customReason.trim().length < 5) {
      if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
        (window as any).showGlobalToast('Gửi báo cáo thất bại: Lý do báo lỗi quá ngắn (tối thiểu 5 ký tự)!', 'error');
      }
      setIsReporting(false);
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Không có kết nối mạng. Vui lòng kiểm tra lại đường truyền internet!');
      }

      const loggedInUser = (typeof localStorage !== 'undefined' ? (window.APP_USER ? window.APP_USER.username : null) : null) || 'Ẩn danh';
      
      const { error } = await supabase
        .from('txa_error_reports')
        .insert({
          movie_title: movie.title,
          movie_slug: movie.slug,
          episode_name: currentEpisode?.name || 'Tập 1',
          episode_slug: currentEpisode?.slug || 'tap-1',
          server_name: currentServer?.serverName || 'Server VIP',
          reason: reasonSelected,
          user_username: loggedInUser,
          status: 'pending'
        });

      if (error) {
        throw error;
      }

      if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
        (window as any).showGlobalToast('Gửi báo cáo lỗi thành công! Cảm ơn bạn.', 'success');
      }
      setIsReportModalOpen(false);
      setCustomReason('');
      setReportReason('Không load được video');
    } catch (err: any) {
      if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
        (window as any).showGlobalToast(`Gửi báo cáo thất bại: ${err.message || 'Lỗi cơ sở dữ liệu'}`, 'error');
      }
    } finally {
      setIsReporting(false);
    }
  };

  const [serverIndex, setServerIndex] = useState<number>(() => {
    if (initialServerIndex >= 0 && initialServerIndex < servers.length) {
      return initialServerIndex;
    }
    return 0;
  });

  const [episodeIndex, setEpisodeIndex] = useState<number>(() => {
    if (servers.length === 0) return 0;
    const currentServer = servers[initialServerIndex >= 0 && initialServerIndex < servers.length ? initialServerIndex : 0];
    return findEpisodeIndexBySlug(currentServer?.serverData || [], initialEpisodeSlug);
  });

  const [currentUserPackage, setCurrentUserPackage] = useState<string>('Free');
  const [userPermissions, setUserPermissions] = useState<any>(null);

  const [showAd, setShowAd] = useState<boolean>(false);
  const [adSkipSeconds, setAdSkipSeconds] = useState<number>(5);
  const [adUrl, setAdUrl] = useState<string>('');
  const [adType, setAdType] = useState<'video' | 'embed'>('video');
  const [adCountdown, setAdCountdown] = useState<number>(5);
  const [canSkipAd, setCanSkipAd] = useState<boolean>(false);
  const [adBlockDetected, setAdBlockDetected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const username = (window.APP_USER ? window.APP_USER.username : null) || '';
    
    const fetchUserAndAds = async () => {
      try {
        const res = await fetch(`/api/auth/me?username=${encodeURIComponent(username)}`);
        let pkgName = 'Free';
        if (res.ok) {
          const result = (await res.json()) as any;
          pkgName = result.data?.package || 'Free';
        }
        setCurrentUserPackage(pkgName);

        // Tải danh sách yêu thích và danh sách phát
        if (username) {
          try {
            const wlRes = await fetch(`/api/user/watchlist?username=${encodeURIComponent(username)}`);
            if (wlRes.ok) {
              const wlData = (await wlRes.json()) as any;
              const favs = wlData.data?.favorites || [];
              const plist = wlData.data?.playlist || [];
              setIsFavorited(favs.includes(movie.slug));
              setIsInPlaylist(plist.includes(movie.slug));
            }
          } catch (e) {
            console.error("Lỗi khi tải danh sách yêu thích/xem sau:", e);
          }
        }

        const settings = (window as any).TXA_SITE_SETTINGS || {};
        const packages = settings.packages || [];
        const userPkg = packages.find((p: any) => p.title === pkgName);
        let perms = null;
        if (userPkg) {
          perms = userPkg.permissions;
        } else {
          const freePkg = packages.find((p: any) => p.id === 'free') || {};
          perms = freePkg.permissions || {
            max_resolution: 'SD',
            allowed_servers: ["Vietsub", "Thuyết Minh", "Lồng Tiếng"],
            max_playlists: 10,
            watch_together: false,
            hide_watermark: false,
            vip_badge: false,
            bypass_ads: false
          };
        }
        setUserPermissions(perms);

        // Check AdBlock state for Free users
        const isFreeUser = pkgName.toLowerCase() === 'free' || !perms?.bypass_ads;
        if (isFreeUser) {
          // Poll window.TXA_ADBLOCK_DETECTED which is set by MainLayout
          const checkAdBlockState = () => {
            if (typeof (window as any).TXA_ADBLOCK_DETECTED !== 'undefined') {
              setAdBlockDetected(!!(window as any).TXA_ADBLOCK_DETECTED);
            } else {
              // Not checked yet — wait briefly then re-check
              setTimeout(checkAdBlockState, 500);
            }
          };
          checkAdBlockState();
        } else {
          setAdBlockDetected(false); // Paid user — never blocked
        }

        // Pre-roll ads logic
        const ads = settings.ads || {};
        const bypass = perms?.bypass_ads || false;

        if (ads.pre_roll_enable && ads.pre_roll_url && !bypass) {
          const rawUrls = ads.pre_roll_url;
          // Split by newline. If there's a comma, it might break iframe codes so we prefer newline split for pre-roll
          const urls = rawUrls.split(/\n+/).map((u: string) => u.trim()).filter(Boolean);
          if (urls.length > 0) {
            let randomUrl = urls[Math.floor(Math.random() * urls.length)];
            const adType = ads.pre_roll_type || 'video';
            
            // Tự động convert link youtube thường sang link embed nếu đang chọn mã nhúng
            if (adType === 'embed') {
              if (randomUrl.includes('youtube.com/watch?v=')) {
                const videoId = new URL(randomUrl).searchParams.get('v');
                if (videoId) randomUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
              } else if (randomUrl.includes('youtu.be/')) {
                const videoId = randomUrl.split('youtu.be/')[1]?.split('?')[0];
                if (videoId) randomUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
              }
            }

            setShowAd(true);
            setAdUrl(randomUrl);
            setAdType(adType);
            const skipSec = parseInt(ads.pre_roll_skip_seconds) || 5;
            setAdSkipSeconds(skipSec);
            setAdCountdown(skipSec);
          }
        }
      } catch (e) {
        console.error("Error fetching user details in player:", e);
      }
    };
    fetchUserAndAds();
  }, [movie.slug]);

  useEffect(() => {
    if (!showAd) return;
    if (adCountdown <= 0) {
      setCanSkipAd(true);
      return;
    }
    const timer = setTimeout(() => {
      setAdCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [showAd, adCountdown]);

  const handleAdEnded = () => {
    setShowAd(false);
  };

  const handleSkipAd = () => {
    setShowAd(false);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('txa_crawled_movies');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            const found = list.find((m: any) => {
              const movieData = m.movie || m;
              return movieData.slug === initialMovie.slug;
            });
            if (found) {
              const detailedMovie: MovieDetail = found;
              setMovie(detailedMovie);

              const newServers = detailedMovie.episodes || [];
              let newServerIndex = initialServerIndex;
              if (newServerIndex < 0 || newServerIndex >= newServers.length) {
                newServerIndex = 0;
              }
              setServerIndex(newServerIndex);

              const currentServer = newServers[newServerIndex];
              const newEpisodeIndex = findEpisodeIndexBySlug(currentServer?.serverData || [], initialEpisodeSlug);
              setEpisodeIndex(newEpisodeIndex);
            }
          }
        }
      } catch (e) {
        console.error('Error hydrating movie from local storage:', e);
      }
    }
  }, [initialMovie.slug]);

  const [activeTab, setActiveTab] = useState<number>(0);
  const [resumePrompt, setResumePrompt] = useState<{
    show: boolean;
    time: number;
    episodeSlug: string;
  } | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isHacked, setIsHacked] = useState<boolean>(false);
  const playerGetTimeRef = useRef<(() => number) | null>(null);
  const [resolvedSubtitles, setResolvedSubtitles] = useState<any[]>([]);

  // DevTools detection with admin bypass
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Bypass for admin
    const isAdmin = (window as any).APP_USER && (
      (window as any).APP_USER.role === 'admin' || 
      (window as any).APP_USER.roles === 'admin' || 
      (window as any).APP_USER.username === 'admin'
    );
    if (isAdmin) return;

    let devtoolsOpen = false;
    const threshold = 160;

    const emitEvent = (isOpen: boolean) => {
      if (isOpen && !devtoolsOpen) {
        setIsHacked(true);
        devtoolsOpen = true;
      }
    };

    const checkSize = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        emitEvent(true);
      }
    };

    const checkDebugger = () => {
      const startTime = performance.now();
      debugger;
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        emitEvent(true);
      }
    };

    const sizeInterval = setInterval(checkSize, 1000);
    const debugInterval = setInterval(checkDebugger, 1000);

    return () => {
      clearInterval(sizeInterval);
      clearInterval(debugInterval);
    };
  }, []);

  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [isInPlaylist, setIsInPlaylist] = useState<boolean>(false);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return true;
    try {
      const stored = localStorage.getItem('tsettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.isCompact !== false;
      }
    } catch (e) {}
    return true;
  });

  const toggleCompact = () => {
    const nextState = !isCompact;
    setIsCompact(nextState);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('tsettings');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.isCompact = nextState;
        localStorage.setItem('tsettings', JSON.stringify(parsed));
      } catch (e) {}
    }
  };

  const [autoNext, setAutoNext] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return true;
    try {
      const stored = localStorage.getItem('tsettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.autoNext !== false;
      }
    } catch (e) {}
    return true;
  });

  const [autoSkip, setAutoSkip] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    try {
      const stored = localStorage.getItem('tsettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return !!parsed.autoSkip;
      }
    } catch (e) {}
    return false;
  });

  const toggleFavorite = async () => {
    if (typeof window === 'undefined') return;
    const username = (window.APP_USER ? window.APP_USER.username : null);
    if (!username) {
      if ((window as any).showGlobalToast) {
        (window as any).showGlobalToast('Vui lòng đăng nhập để sử dụng tính năng này!', 'error');
      }
      setTimeout(() => {
        if ((window as any).openLoginModal) {
          (window as any).openLoginModal();
        }
      }, 800);
      return;
    }

    const nextState = !isFavorited;
    setIsFavorited(nextState);

    try {
      if (!nextState) {
        const delRes = await fetch(`/api/user/watchlist?username=${encodeURIComponent(username)}&slug=${encodeURIComponent(movie.slug)}&type=favorite`, {
          method: 'DELETE'
        });
        if (delRes.ok) {
          if ((window as any).showGlobalToast) {
            (window as any).showGlobalToast('Đã xóa khỏi danh sách Yêu thích!', 'success');
          }
        } else {
          throw new Error('Lỗi xóa yêu thích');
        }
      } else {
        const res = await fetch('/api/user/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, slug: movie.slug, type: 'favorite' })
        });
        if (res.ok) {
          if ((window as any).showGlobalToast) {
            (window as any).showGlobalToast('Đã thêm vào danh sách Yêu thích!', 'success');
          }
        } else {
          const errData = (await res.json()) as any;
          throw new Error(errData.message || 'Lỗi thêm yêu thích');
        }
      }
    } catch (e: any) {
      setIsFavorited(!nextState);
      if ((window as any).showGlobalToast) {
        (window as any).showGlobalToast(e.message || 'Lỗi xử lý yêu thích', 'error');
      }
    }
  };

  const togglePlaylist = async () => {
    if (typeof window === 'undefined') return;
    const username = (window.APP_USER ? window.APP_USER.username : null);
    if (!username) {
      if ((window as any).showGlobalToast) {
        (window as any).showGlobalToast('Vui lòng đăng nhập để sử dụng tính năng này!', 'error');
      }
      setTimeout(() => {
        if ((window as any).openLoginModal) {
          (window as any).openLoginModal();
        }
      }, 800);
      return;
    }

    const nextState = !isInPlaylist;
    setIsInPlaylist(nextState);

    try {
      if (!nextState) {
        const delRes = await fetch(`/api/user/watchlist?username=${encodeURIComponent(username)}&slug=${encodeURIComponent(movie.slug)}&type=playlist`, {
          method: 'DELETE'
        });
        if (delRes.ok) {
          if ((window as any).showGlobalToast) {
            (window as any).showGlobalToast('Đã xóa khỏi Danh sách phát!', 'success');
          }
        } else {
          throw new Error('Lỗi xóa danh sách phát');
        }
      } else {
        const res = await fetch('/api/user/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, slug: movie.slug, type: 'playlist' })
        });
        if (res.ok) {
          if ((window as any).showGlobalToast) {
            (window as any).showGlobalToast('Đã thêm vào Danh sách phát!', 'success');
          }
        } else {
          const errData = (await res.json()) as any;
          throw new Error(errData.message || 'Lỗi thêm danh sách phát');
        }
      }
    } catch (e: any) {
      setIsInPlaylist(!nextState);
      if ((window as any).showGlobalToast) {
        (window as any).showGlobalToast(e.message || 'Lỗi xử lý danh sách phát', 'error');
      }
    }
  };

  const toggleAutoNext = () => {
    const nextState = !autoNext;
    setAutoNext(nextState);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('tsettings');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.autoNext = nextState;
        localStorage.setItem('tsettings', JSON.stringify(parsed));
      } catch (e) {}
    }
    if ((window as any).showGlobalToast) {
      (window as any).showGlobalToast(`Tự động chuyển tập: ${nextState ? 'Bật' : 'Tắt'}`, 'success');
    }
  };

  const toggleAutoSkip = () => {
    const nextState = !autoSkip;
    setAutoSkip(nextState);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('tsettings');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.autoSkip = nextState;
        localStorage.setItem('tsettings', JSON.stringify(parsed));
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('txa-autoskip-changed', { detail: nextState }));
    if ((window as any).showGlobalToast) {
      (window as any).showGlobalToast(`Bỏ qua giới thiệu: ${nextState ? 'Bật' : 'Tắt'}`, 'success');
    }
  };

  const toggleCinemaMode = () => {
    setIsCinemaMode(!isCinemaMode);
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      if ((window as any).showGlobalToast) {
        (window as any).showGlobalToast('Đã sao chép liên kết xem phim vào bộ nhớ tạm!', 'success');
      }
    }
  };

  const currentServer = servers[serverIndex] || null;
  const currentEpisode = currentServer?.serverData[episodeIndex] || null;

  useEffect(() => {
    if (!currentEpisode) {
      setResolvedSubtitles([]);
      return;
    }
    const subs = [...(currentEpisode.subtitles || [])];
    const rawSrt = (currentEpisode as any).subtitles_srt || (currentEpisode as any).subtitlesSrt;
    let localUrl = '';
    if (rawSrt && rawSrt.trim()) {
      try {
        const blob = new Blob([rawSrt], { type: 'text/plain;charset=utf-8' });
        localUrl = URL.createObjectURL(blob) + '#/sub.srt';
        subs.push({
          label: 'Tiếng Việt',
          file: localUrl,
          default: true
        });
      } catch (e) {
        console.error('Error creating blob for subtitles_srt:', e);
      }
    }
    setResolvedSubtitles(subs);
    return () => {
      if (localUrl) {
        // Remove hash before revoking object URL to avoid issues in some browsers
        const cleanUrl = localUrl.split('#')[0];
        URL.revokeObjectURL(cleanUrl);
      }
    };
  }, [currentEpisode]);

  const totalEps = currentServer?.serverData.length || 0;
  const episodesPerTab = totalEps > 100 ? 100 : 25;
  const totalTabs = Math.ceil(totalEps / episodesPerTab);

  useEffect(() => {
    const tab = Math.floor(episodeIndex / episodesPerTab);
    setActiveTab(tab);
  }, [episodeIndex, episodesPerTab]);

  const getLocalHistory = (): HistoryItem[] => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('thistory');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const saveLocalHistory = (list: HistoryItem[]) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('thistory', JSON.stringify(list));
    }
  };

  const syncOfflineHistories = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const username = typeof localStorage !== 'undefined' ? (window.APP_USER ? window.APP_USER.username : null) : null;
    if (!username) return;

    const list = getLocalHistory();
    const unsynced = list.filter(item => !item.synced);
    
    if (unsynced.length === 0) return;

    for (const item of unsynced) {
      try {
        const res = await fetch('/api/user/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            slug: item.slug,
            episodeSlug: item.episodeSlug,
            episodeName: item.episodeName,
            currentTime: item.currentTime,
            duration: item.duration,
            serverIndex: item.serverIndex,
            serverName: item.serverName,
            updatedAt: item.updatedAt
          })
        });
        if (res.ok) {
          const currentList = getLocalHistory();
          const target = currentList.find(x => x.slug === item.slug);
          if (target) {
            target.synced = true;
            saveLocalHistory(currentList);
          }
        }
      } catch (e) {
        console.warn(`Sync failed for movie slug ${item.slug}:`, e);
      }
    }
  };

  useEffect(() => {
    const mergeHistoryOnLoad = async () => {
      const username = typeof localStorage !== 'undefined' ? (window.APP_USER ? window.APP_USER.username : null) : null;

      if (!username) {
        const localList = getLocalHistory();
        const localMovieHist = localList.find(x => x.slug === movie.slug);
        
        if (localMovieHist && localMovieHist.episodeSlug === currentEpisode?.slug && localMovieHist.currentTime > 10 && (localMovieHist.duration - localMovieHist.currentTime) > 10) {
          setResumePrompt({
            show: true,
            time: localMovieHist.currentTime,
            episodeSlug: localMovieHist.episodeSlug
          });
        }
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const res = await fetch(`/api/user/history?username=${encodeURIComponent(username)}`);
          if (res.ok) {
            const onlineList = await res.json();
            if (Array.isArray(onlineList) && onlineList.length > 0) {
              const movieHist = onlineList.find(x => x.slug === movie.slug);
              if (movieHist && currentEpisode && movieHist.episodeSlug === currentEpisode.slug) {
                if (movieHist.currentTime > 10 && (movieHist.duration - movieHist.currentTime) > 10) {
                  setResumePrompt({
                    show: true,
                    time: movieHist.currentTime,
                    episodeSlug: movieHist.episodeSlug
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn("Failed to fetch online history:", e);
        }
      }

      syncOfflineHistories();
    };

    if (currentEpisode) {
      setPlaybackTime(0);
      setResumePrompt(null);
      mergeHistoryOnLoad();
    }
  }, [movie.slug, currentEpisode?.slug]);

  useEffect(() => {
    const handleOnline = () => {
      syncOfflineHistories();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleTimeUpdate = async (time: number, duration: number) => {
    if (!currentEpisode) return;

    const timeRounded = Math.round(time);
    const durationRounded = Math.round(duration);
    const username = typeof localStorage !== 'undefined' ? (window.APP_USER ? window.APP_USER.username : null) : null;

    if (!username) {
      const list = getLocalHistory();
      const existingIdx = list.findIndex(x => x.slug === movie.slug);

      const record: HistoryItem = {
        slug: movie.slug,
        episodeSlug: currentEpisode.slug,
        episodeName: currentEpisode.name,
        currentTime: timeRounded,
        duration: durationRounded,
        serverIndex: serverIndex,
        serverName: currentServer?.serverName || 'Server VIP',
        updatedAt: new Date().toISOString(),
        synced: false,
        title: movie.title,
        posterUrl: movie.posterUrl
      };

      if (existingIdx !== -1) {
        list[existingIdx] = record;
      } else {
        list.unshift(record);
      }
      
      saveLocalHistory(list);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await fetch('/api/user/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            slug: movie.slug,
            episodeSlug: currentEpisode.slug,
            episodeName: currentEpisode.name,
            currentTime: timeRounded,
            duration: durationRounded,
            serverIndex: serverIndex,
            serverName: currentServer?.serverName || 'Server VIP',
            updatedAt: new Date().toISOString(),
            title: movie.title,
            posterUrl: movie.posterUrl
          })
        });
        if (!res.ok) {
          throw new Error('Failed to save progress to DB');
        }
      } catch (e) {
        const list = getLocalHistory();
        const existingIdx = list.findIndex(x => x.slug === movie.slug);
        const record: HistoryItem = {
          slug: movie.slug,
          episodeSlug: currentEpisode.slug,
          episodeName: currentEpisode.name,
          currentTime: timeRounded,
          duration: durationRounded,
          serverIndex: serverIndex,
          serverName: currentServer?.serverName || 'Server VIP',
          updatedAt: new Date().toISOString(),
          synced: false,
          title: movie.title,
          posterUrl: movie.posterUrl
        };
        if (existingIdx !== -1) {
          list[existingIdx] = record;
        } else {
          list.unshift(record);
        }
        saveLocalHistory(list);
      }
    } else {
      const list = getLocalHistory();
      const existingIdx = list.findIndex(x => x.slug === movie.slug);
      const record: HistoryItem = {
        slug: movie.slug,
        episodeSlug: currentEpisode.slug,
        episodeName: currentEpisode.name,
        currentTime: timeRounded,
        duration: durationRounded,
        serverIndex: serverIndex,
        serverName: currentServer?.serverName || 'Server VIP',
        updatedAt: new Date().toISOString(),
        synced: false,
        title: movie.title,
        posterUrl: movie.posterUrl
      };
      if (existingIdx !== -1) {
        list[existingIdx] = record;
      } else {
        list.unshift(record);
      }
      saveLocalHistory(list);
    }
  };

  const handleEnded = () => {
    if (!autoNext) return;
    if (currentServer && episodeIndex < currentServer.serverData.length - 1) {
      if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
        (window as any).showGlobalToast('Hết tập! Tự động chuyển sang tập tiếp theo sau 3 giây...', 'info');
      }
      setTimeout(() => {
        selectEpisode(episodeIndex + 1);
      }, 3000);
    }
  };

  const handleAcceptResume = () => {
    if (resumePrompt) {
      setPlaybackTime(resumePrompt.time);
      setResumePrompt(null);
      if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
        (window as any).showGlobalToast('Đã tiếp tục xem từ vị trí cũ!', 'success');
      }
    }
  };

  const handleDeclineResume = () => {
    setResumePrompt(null);
  };

  const selectEpisode = (idx: number) => {
    setEpisodeIndex(idx);
    if (currentServer) {
      const ep = currentServer.serverData[idx];
      const newUrl = `${window.location.pathname}?ep=${ep.slug}&sv=${serverIndex}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const selectServer = (idx: number) => {
    if (idx > 0 && currentUserPackage.toLowerCase() === 'free') {
      const modalContent = `
        <div class="flex flex-col items-center justify-center p-6 text-center relative overflow-hidden space-y-4">
          <div class="bg-primary/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto border border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.25)]">
            <span class="material-symbols-outlined text-2xl text-primary" style="font-variation-settings: 'FILL' 1">lock</span>
          </div>
          <h3 class="font-display-hero text-lg font-black text-white tracking-wide uppercase">Nguồn phát VIP giới hạn</h3>
          <p class="text-xs text-zinc-400 leading-relaxed font-body-main max-w-sm">
            Nguồn phát này chỉ dành cho tài khoản sử dụng các gói cước nâng cao. Vui lòng nâng cấp gói để mở khóa.
          </p>
          <div class="px-4 py-2 bg-white/5 border border-glass-stroke/50 rounded-xl">
            <p class="text-[10px] text-zinc-400 font-body-main">
              Gói hiện tại của bạn: <em class="not-italic font-bold text-zinc-200">${currentUserPackage}</em>
            </p>
          </div>
          <div class="pt-2">
            <a href="/nang-cap" class="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d2bbff] to-[#00daf3] text-slate-950 font-black rounded-xl text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 border-none uppercase tracking-wider decoration-none no-underline">
              <span class="material-symbols-outlined text-xs font-black">workspace_premium</span>
              Nâng cấp gói ngay
            </a>
          </div>
        </div>
      `;

      if ((window as any).txamodal) {
        (window as any).txamodal.show({
          title: 'Nguồn phát VIP giới hạn',
          content: modalContent,
          type: 'info',
          confirmText: '',
          cancelText: 'Đóng',
          onConfirm: () => {}
        });
      }
      return;
    }

    let preservedTime = 0;
    if (playerGetTimeRef.current) {
      preservedTime = Math.floor(playerGetTimeRef.current());
    }

    const nextEpIdx = Math.min(episodeIndex, servers[idx].serverData.length - 1);
    const validEpIdx = nextEpIdx >= 0 ? nextEpIdx : 0;
    
    setServerIndex(idx);
    setEpisodeIndex(validEpIdx);

    if (preservedTime > 5) {
      setPlaybackTime(preservedTime);
      if (typeof window !== 'undefined' && (window as any).showGlobalToast) {
        (window as any).showGlobalToast(
          `Đã chuyển sang ${servers[idx].serverName} — tiếp tục từ ${Math.floor(preservedTime / 60)}:${String(Math.floor(preservedTime % 60)).padStart(2, '0')}`,
          'success'
        );
      }
    } else {
      setPlaybackTime(0);
    }
    
    playerGetTimeRef.current = null;
    
    const ep = servers[idx].serverData[validEpIdx];
    const newUrl = `${window.location.pathname}?ep=${ep?.slug || 'tap-1'}&sv=${idx}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const showBadge = nextAiringEpisode || (movie.broadcastSchedule && (movie.broadcastSchedule.notice || movie.broadcastSchedule.nextDate));
  const badgeDate = nextAiringEpisode ? nextAiringEpisode.airDate : movie.broadcastSchedule?.nextDate;
  const badgeTime = nextAiringEpisode ? nextAiringEpisode.airTime : movie.broadcastSchedule?.nextTime;
  
  const localAiring = formatLocalAirDateTime(badgeDate, badgeTime);
  const badgeLabel = nextAiringEpisode 
    ? `${nextAiringEpisode.name} sẽ phát sóng lúc ${localAiring.text}. Các bạn nhớ đón xem nhé 😘`
    : movie.broadcastSchedule?.notice || `Tập tiếp theo sẽ phát sóng lúc ${localAiring.text}. Các bạn nhớ đón xem nhé 😘`;

  if (!currentServer || (!currentEpisode && !isUnreleased)) {
    return (
      <div className="text-center py-20 text-on-surface-variant font-body-main">
        Không có dữ liệu nguồn phát cho bộ phim này.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Lịch phát sóng badge */}
      {showBadge && badgeDate && (
        <CountdownBadge 
          date={badgeDate} 
          time={badgeTime} 
          label={badgeLabel} 
        />
      )}

      {isCinemaMode && (
        <div 
          className="fixed inset-0 bg-black/92 z-[49] transition-opacity duration-300 cursor-pointer"
          onClick={() => setIsCinemaMode(false)}
        />
      )}

      {/* Player Section */}
      <div className={`relative transition-all duration-300 ${isCinemaMode ? 'z-50 xl:scale-[1.03] shadow-[0_0_80px_rgba(0,0,0,0.9)]' : 'z-10'} glass-card bg-surface-card border border-glass-stroke rounded-2xl overflow-hidden shadow-2xl`}>
        <div className="w-full aspect-video bg-black relative">
          {isHacked ? (
            <iframe 
              src="/embed/crash" 
              className="w-full h-full border-none rounded-xl"
              data-txatooltip="Cảnh báo can thiệp hệ thống"
            />
          ) : adBlockDetected && currentUserPackage.toLowerCase() === 'free' ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#09090b] p-6 sm:p-10 text-center relative overflow-hidden">
              {/* Backglow auras */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
              <div className="absolute top-1/3 left-1/3 w-[200px] h-[200px] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10 glass-card bg-zinc-950/60 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-6 sm:p-10 max-w-lg w-full flex flex-col items-center gap-5 sm:gap-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-fade-in duration-300">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/10 border border-rose-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <span className="material-symbols-outlined text-3xl sm:text-4xl text-rose-500 animate-bounce">gpp_maybe</span>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-display-hero text-2xl sm:text-3xl font-black tracking-tight text-white uppercase bg-gradient-to-r from-rose-400 via-amber-400 to-rose-500 -webkit-background-clip-text -webkit-text-fill-color-transparent">
                    PHÁT HIỆN CHẶN QUẢNG CÁO!
                  </h3>
                  <p className="text-sm sm:text-base text-zinc-300 font-semibold leading-relaxed">
                    Bạn đang sử dụng trình chặn quảng cáo (AdBlock).
                  </p>
                </div>

                <div className="text-xs sm:text-sm text-zinc-400 leading-relaxed space-y-3">
                  <p>
                    Để duy trì máy chủ tốc độ cao và phát phim chất lượng tốt hoàn toàn <span className="text-rose-400 font-extrabold uppercase">miễn phí</span>, chúng tôi rất cần doanh thu quảng cáo để chi trả chi phí hệ thống.
                  </p>
                  <p className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 text-[11px] sm:text-xs text-amber-300/90 font-medium">
                    💡 Hãy tắt trình chặn quảng cáo (hoặc thêm trang web này vào danh sách ngoại lệ), sau đó tải lại trang để bắt đầu xem phim. Hoặc nâng cấp lên gói <span className="text-white font-black underline decoration-amber-400">VIP Premium</span> để loại bỏ hoàn toàn quảng cáo!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full pt-3">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="flex-1 px-6 py-3.5 bg-zinc-900 border border-zinc-800 text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-zinc-800 hover:border-zinc-700 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    Đã tắt — Tải lại trang
                  </button>
                  <a
                    href="/nang-cap"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-white rounded-2xl text-xs sm:text-sm font-black active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(239,68,68,0.3)]"
                  >
                    Nâng cấp VIP
                    <span className="material-symbols-outlined text-base font-bold">workspace_premium</span>
                  </a>
                </div>
              </div>
            </div>
          ) : isUnreleased && unreleasedEpisode ? (
            <UnreleasedPlayerPlaceholder episode={unreleasedEpisode} />
          ) : showAd ? (
            <div className="absolute inset-0 bg-black flex items-center justify-center z-[50]">
              {adType === 'video' ? (
                <video 
                  src={adUrl} 
                  autoPlay 
                  controls={false} 
                  className="w-full h-full object-contain" 
                  onEnded={handleAdEnded}
                />
              ) : (
                <iframe 
                  src={adUrl} 
                  className="w-full h-full border-none" 
                  allow="autoplay"
                />
              )}
              <div className="absolute bottom-6 right-6 flex items-center gap-3">
                {canSkipAd ? (
                  <button 
                    onClick={handleSkipAd}
                    className="px-5 py-2.5 bg-[#d2bbff] text-slate-950 font-black rounded-xl text-xs hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(210,187,255,0.4)] flex items-center gap-1.5 border-none cursor-pointer"
                  >
                    <span>Bỏ qua quảng cáo</span>
                    <span className="material-symbols-outlined text-sm font-bold">skip_next</span>
                  </button>
                ) : adCountdown <= 5 ? (
                  <div className="px-5 py-2.5 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl text-[10px] text-white font-bold tracking-wider uppercase">
                    Bỏ qua ({adCountdown})
                  </div>
                ) : null}
              </div>
            </div>
          ) : userPermissions && currentServer && !userPermissions.allowed_servers?.some((s: string) => s.toLowerCase() === currentServer.serverName.toLowerCase()) ? (
            <div className="w-full h-full aspect-video bg-[#0d0e14] border border-glass-stroke rounded-2xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-primary/5 blur-[50px] pointer-events-none"></div>
              <div className="relative z-10 space-y-4 max-w-md">
                <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-primary/20 shadow-[0_0_30px_rgba(124,58,237,0.2)] animate-pulse">
                  <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                </div>
                <h3 className="font-display-hero text-xl font-black text-white tracking-wide uppercase">Nguồn phát VIP giới hạn</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-body-main">
                  Server <span className="text-primary font-bold">{currentServer?.serverName}</span> chỉ dành cho tài khoản sử dụng các gói cước nâng cao. Vui lòng nâng cấp gói để mở khóa.
                </p>
                <div className="px-4 py-2 bg-white/5 border border-glass-stroke/50 rounded-xl inline-block">
                  <p className="text-[10px] text-zinc-400 font-body-main">
                     Gói hiện tại của bạn: <em className="not-italic font-bold text-zinc-200">{currentUserPackage}</em>
                  </p>
                </div>
                <div className="pt-2">
                  <a href="/nang-cap" className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d2bbff] to-[#00daf3] text-slate-950 font-black rounded-xl text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 border-none uppercase tracking-wider decoration-none no-underline">
                    <span className="material-symbols-outlined text-xs font-black">workspace_premium</span>
                    Nâng cấp gói ngay
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <>
              <ArtPlayer 
                key={`${currentEpisode?.slug}_${serverIndex}_${playbackTime}_${resolvedSubtitles.map(s => s.file).join(',')}`}
                url={currentEpisode?.linkM3u8 || ''}
                title={`${movie.title} - ${currentEpisode?.name || ''}`}
                poster={movie.bannerUrl || movie.posterUrl}
                currentTime={playbackTime}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onPlayerReady={(getTime) => {
                  playerGetTimeRef.current = getTime;
                }}
                subtitles={resolvedSubtitles}
                qualities={[
                  { html: 'Auto', url: currentEpisode?.linkM3u8 || '', default: true }
                ]}
                onChangeQuality={(item) => {
                  console.log('Chất lượng phát: ', item.html);
                }}
                timeIntroStart={currentEpisode?.timeIntroStart}
                timeIntroEnd={currentEpisode?.timeIntroEnd}
                timeOutroStart={currentEpisode?.timeOutroStart}
                timeOutroEnd={currentEpisode?.timeOutroEnd}
                siteName={siteName}
                siteUrl={siteUrl}
                maxResolution={userPermissions?.max_resolution}
              />

              {/* Resume Prompt Dialog */}
              {resumePrompt?.show && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-6 animate-[modalZoomIn_0.25s_ease-out]">
                  <div className="bg-surface-card border border-glass-stroke p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <span className="material-symbols-outlined text-4xl text-primary animate-bounce">history</span>
                    <div>
                      <h4 className="text-white font-title-md font-bold text-lg">Xem tiếp phim</h4>
                      <p className="text-on-surface-variant text-sm mt-1">
                        Bạn đã xem tập này đến <span className="text-primary font-bold">{formatTime(resumePrompt.time)}</span>. Bạn có muốn xem tiếp từ vị trí này không?
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center pt-2">
                      <button 
                        type="button"
                        onClick={handleDeclineResume}
                        className="px-4 py-2 border border-glass-stroke rounded-xl text-xs font-bold text-on-surface hover:bg-white/5 active:scale-95 transition-all cursor-pointer bg-transparent"
                      >
                        Xem từ đầu
                      </button>
                      <button 
                        type="button"
                        onClick={handleAcceptResume}
                        className="px-5 py-2 bg-primary text-slate-950 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(210,187,255,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
                      >
                        Xem tiếp
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Control bar under video player */}
      <div className="glass-card bg-zinc-950/65 border border-glass-stroke rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xl text-zinc-300 relative z-10">
        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
          {/* Yêu thích */}
          <button 
            onClick={toggleFavorite} 
            className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-zinc-300"
          >
            <span className={`material-symbols-outlined text-[18px] ${isFavorited ? 'text-rose-500 fill-rose-500' : ''}`} style={{ fontVariationSettings: isFavorited ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
            <span>Yêu thích</span>
          </button>

          {/* Thêm vào */}
          <button 
            onClick={togglePlaylist} 
            className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-zinc-300"
          >
            <span className={`material-symbols-outlined text-[18px] ${isInPlaylist ? 'text-primary fill-primary' : ''}`} style={{ fontVariationSettings: isInPlaylist ? "'FILL' 1" : "'FILL' 0" }}>{isInPlaylist ? 'bookmark_added' : 'bookmark_add'}</span>
            <span>Thêm vào</span>
          </button>

          {/* Chuyển tập */}
          <button 
            onClick={toggleAutoNext}
            className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-zinc-300"
          >
            <span>Chuyển tập</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${autoNext ? 'bg-primary/20 border-primary text-primary' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
              {autoNext ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Bỏ qua giới thiệu */}
          <button 
            onClick={toggleAutoSkip}
            className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-zinc-300"
          >
            <span>Bỏ qua giới thiệu</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${autoSkip ? 'bg-primary/20 border-primary text-primary' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
              {autoSkip ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Rạp phim */}
          <button 
            onClick={toggleCinemaMode}
            className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-zinc-300"
          >
            <span>Rạp phim</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${isCinemaMode ? 'bg-primary/20 border-primary text-primary' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
              {isCinemaMode ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Chia sẻ */}
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 text-zinc-300"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>Chia sẻ</span>
          </button>
        </div>

        {/* Báo lỗi */}
        <button 
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-1.5 hover:text-rose-400 transition-colors text-xs font-semibold cursor-pointer bg-transparent border-none p-0 text-zinc-400"
        >
          <span className="material-symbols-outlined text-[18px]">flag</span>
          <span>Báo lỗi</span>
        </button>
      </div>

      {/* Main 2-Column layout under player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Main Film info & Episode grid & Description & Comments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Film Poster Detail Block */}
          <div className="glass-card bg-surface-card border border-glass-stroke rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row gap-5">
            <div className="w-[150px] sm:w-[170px] aspect-[2/3] rounded-xl overflow-hidden border border-glass-stroke shrink-0 shadow-lg relative bg-zinc-900 mx-auto sm:mx-0">
              <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-primary/20 text-primary font-label-caps text-[10px] px-2 py-0.5 rounded border border-primary/25 font-bold">
                  {movie.quality}
                </span>
                <span className="bg-white/10 text-white font-label-caps text-[10px] px-2 py-0.5 rounded border border-white/15 font-bold">
                  {movie.lang}
                </span>
                <span className="bg-white/10 text-white font-label-caps text-[10px] px-2 py-0.5 rounded border border-white/15 font-bold">
                  {movie.releaseYear}
                </span>
                {movie.imdbScore && (
                  <span className="bg-yellow-500/20 text-yellow-400 font-label-caps text-[10px] px-2 py-0.5 rounded border border-yellow-500/25 flex items-center gap-0.5 font-bold">
                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    {movie.imdbScore.toFixed(1)}
                  </span>
                )}
              </div>
              
              <h1 className="font-display-hero text-2xl sm:text-3xl text-white font-bold leading-tight flex flex-wrap items-center gap-3">
                <span>{movie.title} <span className="text-on-surface-variant text-lg sm:text-xl font-light">({currentEpisode?.name || 'Tập 1'})</span></span>
                <button 
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-xs">report_problem</span>
                  Báo lỗi
                </button>
              </h1>
              
              {movie.originalTitle && (
                <h2 className="text-on-surface-variant text-sm font-semibold">{movie.originalTitle}</h2>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-glass-stroke/40 pt-3 text-zinc-400 font-body-main">
                {movie.durationMinutes && (
                  <div>
                    <span className="text-zinc-500">Thời lượng:</span> <span className="text-white font-semibold">{movie.durationMinutes}</span>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">Trạng thái:</span> <span className="text-primary font-bold">{movie.status === 'completed' ? 'Hoàn thành' : 'Đang phát sóng'}</span>
                </div>
                {movie.category && (
                  <div>
                    <span className="text-zinc-500">Quốc gia:</span> <span className="text-white font-semibold">{movie.category}</span>
                  </div>
                )}
                {movie.genres && movie.genres.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="text-zinc-500">Thể loại:</span> <span className="text-white font-semibold">{movie.genres.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Danh Sách Tập */}
          {currentServer && currentServer.serverData.length > 0 && (
            <div className="glass-card bg-surface-card border border-glass-stroke rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-glass-stroke/40 pb-3 gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-white font-headline font-black flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-secondary text-base">list</span>
                    {movie.seasons || 'Phần 1'}
                  </h3>
                  <div className="h-4 w-[1px] bg-zinc-700 hidden sm:block" />
                  
                  {/* Inline Server Selector (Phụ đề, Thuyết minh) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-[320px] sm:max-w-md hide-scrollbar">
                    {servers.map((srv, idx) => {
                      const isActive = idx === serverIndex;
                      const isLocked = idx > 0 && currentUserPackage.toLowerCase() === 'free';
                      return (
                        <button
                          key={srv.serverName}
                          type="button"
                          onClick={() => selectServer(idx)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 ${
                            isActive
                              ? 'bg-primary/20 border border-primary/40 text-white shadow-sm'
                              : 'bg-zinc-900 border border-glass-stroke text-zinc-400 hover:text-white'
                          }`}
                        >
                          {isLocked && <span className="material-symbols-outlined text-[10px] text-amber-400">lock</span>}
                          <span>{srv.serverName}</span>
                          {isLocked && <span className="text-[7px] bg-amber-500/20 text-amber-400 px-0.5 rounded font-black">VIP</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rút gọn Toggle Switch */}
                <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 shrink-0 self-end sm:self-auto">
                  <span>Rút gọn</span>
                  <button
                    type="button"
                    onClick={toggleCompact}
                    className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 focus:outline-none ${
                      isCompact ? 'bg-amber-400' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform duration-200 ${
                        isCompact ? 'transform translate-x-3.5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {totalEps > episodesPerTab && (
                <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar">
                  {Array.from({ length: totalTabs }).map((_, i) => (
                    <button 
                      key={i}
                      type="button"
                      onClick={() => setActiveTab(i)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer border ${
                        i === activeTab 
                          ? 'bg-secondary text-slate-950 border-secondary' 
                          : 'bg-surface border-glass-stroke text-on-surface-variant hover:border-secondary hover:text-secondary'
                      }`}
                    >
                      {i * episodesPerTab + 1} - {Math.min((i + 1) * episodesPerTab, totalEps)}
                    </button>
                  ))}
                </div>
              )}
              
              {isCompact ? (
                // Compact button view (Image 1)
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentServer.serverData
                    .map((ep, idx) => ({ ep, idx }))
                    .filter(({ idx }) => idx >= activeTab * episodesPerTab && idx < (activeTab + 1) * episodesPerTab)
                    .map(({ ep, idx }) => {
                      const isCurrent = idx === episodeIndex;
                      return (
                        <button 
                          key={ep.slug}
                          type="button"
                          onClick={() => selectEpisode(idx)}
                          title={ep.name}
                          className={`relative w-full py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border flex items-center justify-center gap-1.5 ${
                            isCurrent
                              ? 'bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(124,58,237,0.2)] scale-[1.01]' 
                              : 'bg-zinc-900/60 border-glass-stroke text-on-surface hover:bg-white/5 hover:border-white/15'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[14px] ${isCurrent ? 'text-primary' : 'text-zinc-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                          <span>{ep.name}</span>
                        </button>
                      );
                    })}
                </div>
              ) : (
                // Video thumbnail view (Image 2 and 3)
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentServer.serverData
                    .map((ep, idx) => ({ ep, idx }))
                    .filter(({ idx }) => idx >= activeTab * episodesPerTab && idx < (activeTab + 1) * episodesPerTab)
                    .map(({ ep, idx }) => {
                      const isCurrent = idx === episodeIndex;
                      const thumb = (ep as any).thumbUrl || (ep as any).thumb || (ep as any).thumbnail || (ep as any).image || movie.bannerUrl || movie.posterUrl;
                      return (
                        <div 
                          key={ep.slug}
                          onClick={() => selectEpisode(idx)}
                          className="flex flex-col gap-2 cursor-pointer group"
                        >
                          <div className={`relative aspect-[16/9] rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                            isCurrent ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)] scale-[1.01]' : 'border-glass-stroke group-hover:border-white/40'
                          }`}>
                            <img src={thumb} alt={ep.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            
                            {/* Hover Play Button Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="w-10 h-10 rounded-full border-2 border-white bg-black/35 flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-200">
                                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                              </div>
                            </div>

                            {/* Currently playing badge */}
                            {isCurrent && (
                              <span className="absolute bottom-2 left-2 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow">
                                Đang chiếu
                              </span>
                            )}
                          </div>
                          <span className={`text-[11px] font-bold transition-colors ${isCurrent ? 'text-amber-400' : 'text-zinc-400 group-hover:text-amber-400'}`}>
                            {ep.name}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Mô tả phim */}
          <CollapsibleDescription htmlContent={movie.description} />

          {/* Bình luận */}
          <CommentSystem movieSlug={movie.slug} />

        </div>

        {/* RIGHT COLUMN: Ratings & Discord & Actors & Related Movies */}
        <div className="space-y-6">
          
          {/* Đánh giá */}
          <RatingWidget movieSlug={movie.slug} />

          {/* Discord Banner */}
          <DiscordBanner />

          {/* Diễn viên */}
          <ActorsList actors={movie.actors} />

          {/* Phim Liên Quan */}
          {relatedMovies.length > 0 && (
            <div className="glass-card bg-surface-card border border-glass-stroke rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-white font-title-md flex items-center gap-2 font-bold text-sm border-b border-glass-stroke/40 pb-2">
                <span className="material-symbols-outlined text-primary">dynamic_feed</span>
                Phim Liên Quan
              </h3>
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {relatedMovies.map((m: any) => (
                  <a 
                    key={m.id} 
                    href={`/phim/${m.slug}`} 
                    className="flex items-center gap-3 p-2 rounded-xl bg-zinc-950/30 border border-glass-stroke/30 hover:border-primary/20 hover:bg-zinc-950/60 transition-all duration-300 group cursor-pointer w-full text-current hover:no-underline no-underline decoration-none"
                  >
                    <div className="w-14 aspect-[2/3] rounded-lg overflow-hidden border border-glass-stroke shrink-0 relative bg-zinc-900 shadow-md">
                      <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <h4 className="text-white font-title-md text-xs font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors font-outfit">{m.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-semibold">
                        <span>{m.releaseYear || 2024}</span>
                        {m.imdbScore && (
                          <span className="flex items-center gap-0.5 text-yellow-500 font-bold">
                            ★ {m.imdbScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
      {/* Report Error Modal */}
      <TxaModal 
        isOpen={isReportModalOpen} 
        onClose={() => {
          if (!isReporting) {
            setIsReportModalOpen(false);
            setCustomReason('');
          }
        }} 
        title="Báo Cáo Lỗi Tập Phim"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Thông tin lỗi</label>
            <div className="text-xs text-zinc-300 bg-zinc-900/50 border border-glass-stroke/50 p-3 rounded-xl space-y-1 leading-relaxed">
              <div>Phim: <span className="text-white font-bold">{movie.title}</span></div>
              <div>Tập: <span className="text-white font-bold">{currentEpisode?.name || 'Tập 1'}</span></div>
              <div>Nguồn: <span className="text-white font-bold">{currentServer?.serverName || 'Server VIP'}</span></div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Lý do báo lỗi</label>
            <select 
              value={reportReason} 
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="Không load được video">Không load được video (Đứng hình, màn hình đen)</option>
              <option value="Lỗi âm thanh">Lỗi âm thanh (Mất tiếng, lệch tiếng)</option>
              <option value="Phụ đề sai/lệch">Phụ đề bị sai hoặc lệch nhịp</option>
              <option value="Sai tập phim">Tập phim bị sai nội dung</option>
              <option value="Khác">Lý do khác (Nhập chi tiết bên dưới)</option>
            </select>
          </div>

          {reportReason === 'Khác' && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mô tả lý do khác</label>
              <textarea 
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Nhập mô tả cụ thể về lỗi phim tại đây..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary outline-none resize-none font-sans"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button"
              onClick={() => {
                setIsReportModalOpen(false);
                setCustomReason('');
              }}
              disabled={isReporting}
              className="px-4 py-2 border border-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer bg-transparent disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              disabled={isReporting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all cursor-pointer border-none disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isReporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Đang gửi...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  Gửi báo cáo
                </>
              )}
            </button>
          </div>
        </form>
      </TxaModal>
    </div>
  );
};
