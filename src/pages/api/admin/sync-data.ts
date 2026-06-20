import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { settings, zalo_access, zalo_bypass, movies, genres } = body;
    let syncCount = { settings: 0, zalo_access: 0, zalo_bypass: 0, movies: 0, genres: 0 };

    // 1. Đồng bộ Settings
    if (settings && typeof settings === 'object') {
      const keys = ['general', 'social', 'smtp', 'telegram', 'login', 'payment', 'turnstile', 'apiSecurity', 'appMobile'];
      for (const key of keys) {
        if (settings[key]) {
          const { error } = await supabase
            .from('settings')
            .upsert({
              key,
              value: settings[key],
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
          
          if (!error) {
            syncCount.settings++;
          } else {
            console.error(`Sync error on setting key ${key}:`, error);
          }
        }
      }
    }

    // 2. Đồng bộ Zalo Access Requests
    if (zalo_access && Array.isArray(zalo_access)) {
      for (const item of zalo_access) {
        const { error } = await supabase
          .from('zalo_access')
          .upsert({
            token: item.token,
            nickname: item.nickname,
            email: item.email || null,
            status: item.status || 'pending',
            ip: item.ip || null,
            user_agent: item.userAgent || item.user_agent || null,
            created_at: item.createdAt || item.created_at || new Date().toISOString(),
            updated_at: item.updatedAt || item.updated_at || new Date().toISOString()
          }, { onConflict: 'token' });
        
        if (!error) {
          syncCount.zalo_access++;
        } else {
          console.error(`Sync error on zalo_access token ${item.token}:`, error);
        }
      }
    }

    // 3. Đồng bộ Zalo Whitelist Bypasses
    if (zalo_bypass && Array.isArray(zalo_bypass)) {
      for (const item of zalo_bypass) {
        const { error } = await supabase
          .from('zalo_bypass')
          .upsert({
            type: item.type,
            value: item.value,
            description: item.description || null,
            created_at: item.createdAt || item.created_at || new Date().toISOString()
          });
        
        if (!error) {
          syncCount.zalo_bypass++;
        } else {
          console.error(`Sync error on zalo_bypass value ${item.value}:`, error);
        }
      }
    }

    // 4. Đồng bộ Phim (Movies)
    if (movies && Array.isArray(movies)) {
      for (const m of movies) {
        const { error } = await supabase
          .from('movies')
          .upsert({
            title: m.title,
            original_title: m.originalTitle || m.original_title || '',
            slug: m.slug,
            description: m.description || '',
            poster_url: m.posterUrl || m.poster_url || '',
            banner_url: m.bannerUrl || m.banner_url || '',
            release_year: Number(m.releaseYear || m.release_year) || 2024,
            duration_minutes: m.durationMinutes || m.duration_minutes || '',
            type: m.type || 'series',
            status: m.status || 'ongoing',
            episode_current: m.episodeCurrent || m.episode_current || '1',
            episode_total: m.episodeTotal || m.episode_total || '1',
            quality: m.quality || 'FHD',
            lang: m.lang || 'Vietsub',
            imdb_score: Number(m.imdbScore || m.imdb_score) || 0,
            views: Number(m.views) || 0,
            episodes: m.episodes || [],
            actors: m.actors || [],
            directors: m.directors || [],
            genres: m.genres || [],
            seasons: m.seasons || '',
            trailer_url: m.trailerUrl || m.trailer_url || '',
            updated_at: m.updatedAt || m.updated_at || new Date().toISOString()
          }, { onConflict: 'slug' });
        
        if (!error) {
          syncCount.movies++;
        } else {
          console.error(`Sync error on movie slug ${m.slug}:`, error);
        }
      }
    }

    // 5. Đồng bộ Thể loại (Genres)
    if (genres && Array.isArray(genres)) {
      for (const g of genres) {
        const { error } = await supabase
          .from('genres')
          .upsert({
            name: g.name,
            slug: g.slug || g.name.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/g, "d").replace(/Đ/g, "d")
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-"),
            updated_at: new Date().toISOString()
          }, { onConflict: 'slug' });
        
        if (!error) {
          syncCount.genres++;
        } else {
          console.error(`Sync error on genre slug ${g.slug || g.name}:`, error);
        }
      }
    }

    return apiResponse({
      success: true,
      syncCount
    }, 'success', 'Đồng bộ dữ liệu cục bộ lên Cloud thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
