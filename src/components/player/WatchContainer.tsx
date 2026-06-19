import React, { useState, useEffect, useRef } from 'react';
import { ArtPlayer } from './ArtPlayer';
import type { MovieDetail, Episode } from '../../types/movie';

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
  
  // 1. Try exact match
  let idx = serverData.findIndex(ep => ep.slug === targetSlug);
  if (idx !== -1) return idx;

  // 2. Try matching by removing prefix like 'tap-' or 'tập-' or 'ep-'
  const normalizeSlug = (s: string) => {
    return s.toLowerCase().replace(/^(tap|tập|ep|episode|ep-|-)+/g, '').trim();
  };
  const normTarget = normalizeSlug(targetSlug);
  idx = serverData.findIndex(ep => normalizeSlug(ep.slug) === normTarget);
  if (idx !== -1) return idx;

  // 3. Try parsing numbers
  const extractNum = (str: string) => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };
  const targetNum = extractNum(targetSlug);
  if (targetNum !== null) {
    idx = serverData.findIndex(ep => extractNum(ep.slug) === targetNum);
    if (idx !== -1) return idx;
    
    // 4. Try matching by name containing the number
    idx = serverData.findIndex(ep => {
      const epNum = extractNum(ep.name);
      return epNum === targetNum;
    });
    if (idx !== -1) return idx;
  }

  // 5. Try lowercase fuzzy comparison
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTarget = clean(targetSlug);
  idx = serverData.findIndex(ep => {
    const cleanEp = clean(ep.slug);
    return cleanEp === cleanTarget || cleanEp.includes(cleanTarget) || cleanTarget.includes(cleanEp);
  });
  if (idx !== -1) return idx;

  return 0;
};

export const WatchContainer: React.FC<WatchContainerProps> = ({
  movie: initialMovie,
  initialEpisodeSlug,
  initialServerIndex = 0,
  relatedMovies,
  isUnreleased = false,
  unreleasedEpisode = null,
  nextAiringEpisode = null,
  siteName = 'DongMePhim',
  siteUrl = 'https://dongmephim.com'
}) => {
  const [movie, setMovie] = useState<MovieDetail>(initialMovie);
  const servers = movie.episodes || [];
  
  // States
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

  // Hydrate crawled movie details client-side
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

  // DevTools detection loop (Temporarily commented out for debugging)
  useEffect(() => {
    /*
    if (isHacked) {
      const clearInt = setInterval(() => {
        console.clear();
      }, 50);
      return () => clearInterval(clearInt);
    }

    let devtoolsOpenConsecutiveCount = 0;

    const check = () => {
      let isOpen = false;

      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        isOpen = true;
      }

      const start = performance.now();
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        isOpen = true;
      }

      const devtoolsTestObj = new Image();
      Object.defineProperty(devtoolsTestObj, 'id', {
        get: () => {
          isOpen = true;
        }
      });
      console.log(devtoolsTestObj);
      console.clear();

      if (isOpen) {
        devtoolsOpenConsecutiveCount++;
        if (devtoolsOpenConsecutiveCount >= 4) {
          setIsHacked(true);
        }
      } else {
        devtoolsOpenConsecutiveCount = 0;
      }
    };

    const intervalId = setInterval(check, 500);
    return () => clearInterval(intervalId);
    */
  }, [isHacked]);

  const currentServer = servers[serverIndex] || null;
  const currentEpisode = currentServer?.serverData[episodeIndex] || null;

  const totalEps = currentServer?.serverData.length || 0;
  const episodesPerTab = totalEps > 100 ? 100 : 25;
  const totalTabs = Math.ceil(totalEps / episodesPerTab);

  // Sync active tab when episode changes
  useEffect(() => {
    const tab = Math.floor(episodeIndex / episodesPerTab);
    setActiveTab(tab);
  }, [episodeIndex, episodesPerTab]);

  // Helper read thistory from localStorage
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

  // Helper save thistory to localStorage
  const saveLocalHistory = (list: HistoryItem[]) => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('thistory', JSON.stringify(list));
    }
  };

  // Sync offline unsynced histories to server
  const syncOfflineHistories = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    
    const list = getLocalHistory();
    const unsynced = list.filter(item => !item.synced);
    
    if (unsynced.length === 0) return;

    for (const item of unsynced) {
      try {
        const res = await fetch('/api/user/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          // Update synced state in localStorage
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

  // Fetch online history and merge on mount
  useEffect(() => {
    const mergeHistoryOnLoad = async () => {
      // 1. Load local history first
      const localList = getLocalHistory();
      const localMovieHist = localList.find(x => x.slug === movie.slug);
      
      if (localMovieHist && localMovieHist.episodeSlug === currentEpisode?.slug && localMovieHist.currentTime > 10 && (localMovieHist.duration - localMovieHist.currentTime) > 10) {
        setResumePrompt({
          show: true,
          time: localMovieHist.currentTime,
          episodeSlug: localMovieHist.episodeSlug
        });
      }

      // 2. Fetch online history if online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const res = await fetch('/api/user/history');
          if (res.ok) {
            const onlineList = await res.json();
            if (Array.isArray(onlineList) && onlineList.length > 0) {
              const freshLocalList = getLocalHistory();
              let updated = false;

              onlineList.forEach((onlineItem: any) => {
                const localIdx = freshLocalList.findIndex(x => x.slug === onlineItem.slug);
                if (localIdx === -1) {
                  // Not exists in local, add it
                  freshLocalList.unshift({
                    ...onlineItem,
                    synced: true
                  });
                  updated = true;
                } else {
                  // Exists, compare updatedAt
                  const localItem = freshLocalList[localIdx];
                  const localTime = new Date(localItem.updatedAt).getTime();
                  const onlineTime = new Date(onlineItem.updatedAt).getTime();
                  
                  if (onlineTime > localTime) {
                    freshLocalList[localIdx] = {
                      ...onlineItem,
                      synced: true
                    };
                    updated = true;
                  }
                }
              });

              if (updated) {
                saveLocalHistory(freshLocalList);
                
                // If the current movie's history was updated from server, update state
                const updatedMovieHist = freshLocalList.find(x => x.slug === movie.slug);
                if (updatedMovieHist && currentEpisode && updatedMovieHist.episodeSlug === currentEpisode.slug) {
                  if (updatedMovieHist.currentTime > 10 && (updatedMovieHist.duration - updatedMovieHist.currentTime) > 10) {
                    setResumePrompt({
                      show: true,
                      time: updatedMovieHist.currentTime,
                      episodeSlug: updatedMovieHist.episodeSlug
                    });
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn("Failed to fetch online history:", e);
        }
      }

      // Trigger sync in background if online
      syncOfflineHistories();
    };

    if (currentEpisode) {
      setPlaybackTime(0);
      setResumePrompt(null);
      mergeHistoryOnLoad();
    }
  }, [movie.slug, currentEpisode?.slug]);

  // Setup online network sync listeners
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineHistories();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Update history progress on time update
  const handleTimeUpdate = async (time: number, duration: number) => {
    if (!currentEpisode) return;

    const timeRounded = Math.round(time);
    const durationRounded = Math.round(duration);

    // Read and update localStorage list thistory
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

    // Async POST online if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await fetch('/api/user/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: record.slug,
            episodeSlug: record.episodeSlug,
            episodeName: record.episodeName,
            currentTime: record.currentTime,
            duration: record.duration,
            serverIndex: record.serverIndex,
            serverName: record.serverName,
            updatedAt: record.updatedAt,
            title: record.title,
            posterUrl: record.posterUrl
          })
        });
        if (res.ok) {
          // Update local synced status
          const freshList = getLocalHistory();
          const target = freshList.find(x => x.slug === movie.slug);
          if (target) {
            target.synced = true;
            saveLocalHistory(freshList);
          }
        }
      } catch (e) {
        // Silent catch, will sync later
      }
    }
  };

  const handleEnded = () => {
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
      const newUrl = `${window.location.pathname}?ep=${ep.slug}&sv=${serverIndex}&ts=${encodeURIComponent(currentServer.serverName)}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const selectServer = (idx: number) => {
    // Capture current playback time from the player before switching
    let preservedTime = 0;
    if (playerGetTimeRef.current) {
      preservedTime = Math.floor(playerGetTimeRef.current());
    }

    const nextEpIdx = Math.min(episodeIndex, servers[idx].serverData.length - 1);
    const validEpIdx = nextEpIdx >= 0 ? nextEpIdx : 0;
    
    setServerIndex(idx);
    setEpisodeIndex(validEpIdx);

    // Set playback time so the new server's player starts from the same position
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
    
    // Reset the time getter ref since player will remount
    playerGetTimeRef.current = null;
    
    const ep = servers[idx].serverData[validEpIdx];
    const newUrl = `${window.location.pathname}?ep=${ep?.slug || 'tap-1'}&sv=${idx}&ts=${encodeURIComponent(servers[idx].serverName)}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const formatAirDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
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

      {/* Player Section */}
      <div className="relative glass-card bg-surface-card border border-glass-stroke rounded-2xl overflow-hidden shadow-2xl">
        <div className="w-full aspect-video bg-black relative">
          {isHacked ? (
            <iframe 
              src="/embed/crash" 
              className="w-full h-full border-none rounded-xl"
              title="Cảnh báo can thiệp hệ thống"
            />
          ) : isUnreleased && unreleasedEpisode ? (
            <UnreleasedPlayerPlaceholder episode={unreleasedEpisode} />
          ) : (
            <>
              <ArtPlayer 
                key={`${currentEpisode?.slug}_${serverIndex}_${playbackTime}`}
                url={currentEpisode?.linkM3u8 || ''}
                title={`${movie.title} - ${currentEpisode?.name || ''}`}
                poster={movie.bannerUrl || movie.posterUrl}
                currentTime={playbackTime}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onPlayerReady={(getTime) => {
                  playerGetTimeRef.current = getTime;
                }}
                subtitles={currentEpisode?.subtitles}
                timeIntroStart={currentEpisode?.timeIntroStart}
                timeIntroEnd={currentEpisode?.timeIntroEnd}
                timeOutroStart={currentEpisode?.timeOutroStart}
                timeOutroEnd={currentEpisode?.timeOutroEnd}
                siteName={siteName}
                siteUrl={siteUrl}
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
                        onClick={handleDeclineResume}
                        className="px-4 py-2 border border-glass-stroke rounded-xl text-xs font-bold text-on-surface hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                      >
                        Xem từ đầu
                      </button>
                      <button 
                        onClick={handleAcceptResume}
                        className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(210,187,255,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
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

      {/* Movie Details & Episodes switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="bg-primary/20 text-primary font-label-caps text-xs px-2 py-1 rounded border border-primary/20 font-bold">
                {movie.quality}
              </span>
              <span className="bg-white/10 text-white font-label-caps text-xs px-2 py-1 rounded font-bold">
                {movie.lang}
              </span>
              <span className="bg-white/10 text-white font-label-caps text-xs px-2 py-1 rounded font-bold">
                {movie.releaseYear}
              </span>
              {movie.imdbScore && (
                <span className="bg-secondary/20 text-secondary font-label-caps text-xs px-2 py-1 rounded flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  {movie.imdbScore}
                </span>
              )}
              {movie.category && (
                <a href={`/the-loai/${movie.category.toLowerCase().replace(/\s+/g, '-')}`} className="bg-white/5 border border-glass-stroke text-on-surface-variant hover:text-white hover:border-white/20 transition-all font-label-caps text-xs px-2 py-1 rounded">
                  {movie.category}
                </a>
              )}
            </div>
            
            <h1 className="font-display-hero text-3xl md:text-4xl text-white font-bold mb-2">
              {movie.title} <span className="text-on-surface-variant text-2xl font-light">({currentEpisode.name})</span>
            </h1>
            
            {movie.originalTitle && (
              <h2 className="text-on-surface-variant text-lg font-body-main mb-4">{movie.originalTitle}</h2>
            )}

            {(() => {
              const actualEpCount = currentServer?.serverData.length || 0;
              const totalEpNum = parseInt(movie.episodeTotal || '0');
              const isActuallyOngoing = movie.status === 'ongoing' && (totalEpNum === 0 || actualEpCount < totalEpNum);
              
              return isActuallyOngoing ? (
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-200 text-xs font-semibold shadow-inner">
                  <span className="material-symbols-outlined text-amber-400 text-[16px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>
                    Đã chiếu: {(() => {
                      const trimmed = (movie.episodeCurrent || '').trim();
                      return trimmed.toLowerCase().startsWith('tập') ? trimmed : `Tập ${trimmed}`;
                    })()} / {movie.episodeTotal || '?'}
                  </span>
                </div>
              ) : null;
            })()}

            {movie.broadcastSchedule && (movie.broadcastSchedule.notice || movie.broadcastSchedule.nextDate) && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl text-xs text-primary flex items-center gap-3 max-w-xl shadow-[0_0_20px_rgba(124,58,237,0.05)]">
                <span className="material-symbols-outlined text-xl text-primary animate-pulse">calendar_month</span>
                <div>
                  <span className="font-bold text-white tracking-wide uppercase text-[10px] block mb-0.5 opacity-80">Lịch phát sóng tiếp theo</span>
                  <span className="font-medium text-sm text-primary">{movie.broadcastSchedule.notice || `Tập mới sẽ phát sóng vào lúc ${movie.broadcastSchedule.nextTime || '00:00'} ngày ${movie.broadcastSchedule.nextDate}`}</span>
                  {movie.broadcastSchedule.nextDate && movie.broadcastSchedule.notice && (
                    <span className="block text-[10px] text-zinc-400 mt-1">
                      Dự kiến: {movie.broadcastSchedule.nextTime || '00:00'} ngày {movie.broadcastSchedule.nextDate}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <div className="txaformat mt-6 border-t border-glass-stroke pt-4" dangerouslySetInnerHTML={{ __html: movie.description }} />
          </div>

          {/* Related movies */}
          {relatedMovies.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-glass-stroke">
              <h3 className="text-xl text-white font-title-md border-l-4 border-primary pl-4 font-bold">Phim Liên Quan</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {relatedMovies.map((m: any) => (
                  <div key={m.id} className="group relative flex flex-col gap-2 card-hover">
                    <a href={`/phim/${m.slug}`} className="block w-full aspect-[2/3] relative rounded-lg overflow-hidden glass-card border border-glass-stroke transition-all duration-300">
                      <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-deep via-surface-deep/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col justify-end">
                        <h4 className="text-white font-title-md text-xs line-clamp-2 leading-tight font-bold">{m.title}</h4>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Servers and episodes */}
        <div className="space-y-6">
          {/* Server Selector */}
          {servers.length > 0 && (
            <div className="glass-card bg-surface-card border border-glass-stroke rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-title-md flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-primary">dns</span>
                  Nguồn Phát
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>swap_horiz</span>
                  Giữ mốc thời gian khi đổi
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {servers.map((srv, idx) => {
                  const isActive = idx === serverIndex;
                  return (
                    <button 
                      key={srv.serverName}
                      onClick={() => selectServer(idx)}
                      className={`group relative flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/40 text-white shadow-[0_0_20px_rgba(124,58,237,0.15)]' 
                          : 'bg-surface border border-glass-stroke text-on-surface-variant hover:border-primary/30 hover:bg-white/[0.03] hover:text-white'
                      }`}
                    >
                      {/* Equalizer animation for active server */}
                      {isActive ? (
                        <div className="flex items-end gap-[2px] h-4 shrink-0">
                          <span className="w-[3px] bg-primary rounded-full animate-[eqBar1_0.6s_ease-in-out_infinite]" style={{ height: '60%' }} />
                          <span className="w-[3px] bg-primary rounded-full animate-[eqBar2_0.7s_ease-in-out_infinite]" style={{ height: '100%' }} />
                          <span className="w-[3px] bg-primary rounded-full animate-[eqBar3_0.5s_ease-in-out_infinite]" style={{ height: '40%' }} />
                        </div>
                      ) : (
                        <span className="material-symbols-outlined text-[18px] text-zinc-500 group-hover:text-primary transition-colors" style={{ fontVariationSettings: "'FILL' 0" }}>play_circle</span>
                      )}
                      
                      <span className="flex-1 text-left">{srv.serverName}</span>
                      
                      {isActive && (
                        <span className="text-[10px] text-primary/80 font-medium px-2 py-0.5 bg-primary/10 rounded-full border border-primary/15">
                          Đang phát
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <style>{`
                @keyframes eqBar1 {
                  0%, 100% { height: 40%; }
                  50% { height: 100%; }
                }
                @keyframes eqBar2 {
                  0%, 100% { height: 100%; }
                  50% { height: 30%; }
                }
                @keyframes eqBar3 {
                  0%, 100% { height: 60%; }
                  50% { height: 90%; }
                }
              `}</style>
            </div>
          )}

          {/* Episode Selector */}
          {currentServer && currentServer.serverData.length > 0 && (
            <div className="glass-card bg-surface-card border border-glass-stroke rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-title-md flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-secondary">list</span>
                  Danh Sách Tập
                </h3>
                <span className="text-[11px] text-zinc-400 font-semibold bg-white/5 px-2.5 py-1 rounded-full border border-glass-stroke">
                  {totalEps} tập
                </span>
              </div>
              
              {totalEps > episodesPerTab && (
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 hide-scrollbar">
                  {Array.from({ length: totalTabs }).map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        i === activeTab 
                          ? 'bg-secondary text-on-secondary' 
                          : 'bg-surface border border-glass-stroke text-on-surface-variant hover:border-secondary hover:text-secondary'
                      }`}
                    >
                      {i * episodesPerTab + 1} - {Math.min((i + 1) * episodesPerTab, totalEps)}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {currentServer.serverData
                  .map((ep, idx) => ({ ep, idx }))
                  .filter(({ idx }) => idx >= activeTab * episodesPerTab && idx < (activeTab + 1) * episodesPerTab)
                  .map(({ ep, idx }) => {
                    const isCurrent = idx === episodeIndex;
                    return (
                      <button 
                        key={ep.slug}
                        onClick={() => selectEpisode(idx)}
                        title={ep.name}
                        className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isCurrent
                            ? 'bg-primary/20 border-2 border-primary text-primary shadow-[0_0_12px_rgba(124,58,237,0.2)] scale-[1.02]' 
                            : 'bg-surface border border-glass-stroke text-on-surface hover:bg-white/5 hover:border-white/15 hover:scale-[1.03] active:scale-95'
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        )}
                        {idx + 1}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
