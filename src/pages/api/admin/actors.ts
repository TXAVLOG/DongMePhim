import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';

// Wikipedia fallback: tìm diễn viên trên Vietnamese Wikipedia, rồi Chinese Wikipedia
async function fetchActorFromWikipedia(actorName: string): Promise<{ avatarUrl: string; bio: string } | null> {
  // Thử Vietnamese Wikipedia trước
  const wikis = [
    { lang: 'vi', domain: 'vi.wikipedia.org' },
    { lang: 'zh', domain: 'zh.wikipedia.org' }
  ];

  for (const wiki of wikis) {
    try {
      const searchUrl = `https://${wiki.domain}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(actorName)}&utf8=&format=json&srlimit=3&origin=*`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json() as any;
      const results = searchData.query?.search;
      if (!results || results.length === 0) continue;

      // Tìm kết quả khớp tên nhất (title chứa tên diễn viên)
      const bestResult = results.find((r: any) => {
        const t = r.title.toLowerCase();
        const n = actorName.toLowerCase();
        return t === n || t.includes(n) || n.includes(t);
      }) || results[0];

      const title = bestResult.title;
      const detailUrl = `https://${wiki.domain}/w/api.php?action=query&prop=pageimages|extracts&exintro=1&explaintext=1&piprop=original&titles=${encodeURIComponent(title)}&format=json&origin=*`;
      const detailRes = await fetch(detailUrl);
      if (!detailRes.ok) continue;
      const detailData = await detailRes.json() as any;
      const pages = detailData.query?.pages;
      if (!pages) continue;
      const pageId = Object.keys(pages)[0];
      if (pageId === '-1') continue;
      const page = pages[pageId];

      const avatarUrl = page.original?.source || '';
      const bio = page.extract || '';

      // Chỉ trả về nếu có ít nhất ảnh hoặc bio có nội dung
      if (avatarUrl || (bio && bio.length > 20)) {
        return { avatarUrl, bio };
      }
    } catch (e) {
      console.error(`Wikipedia ${wiki.lang} error for ${actorName}:`, e);
    }
  }
  return null;
}

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

// GET: Lấy danh sách diễn viên từ DB
export const GET: APIRoute = async ({ request }) => {
  try {
    const { data: actors, error } = await supabase
      .from('actors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedActors = (actors || []).map(a => ({
      id: a.id,
      name: a.name,
      image: a.avatar_url && a.avatar_url !== '' && !a.avatar_url.includes('logo-decoy') ? a.avatar_url : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80',
      slug: a.slug,
      bio: a.bio,
      tmdb_id: a.tmdb_id
    }));

    return apiResponse(formattedActors, 'success', 'Lấy danh sách diễn viên thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Thêm mới, Chỉnh sửa, Xóa diễn viên
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { action, actor } = body;
    if (!action) {
      return apiResponse(null, 'error', 'Thiếu hành động (action)!', 400, request);
    }

    if (action === 'create') {
      if (!actor || !actor.name) {
        return apiResponse(null, 'error', 'Thiếu thông tin diễn viên!', 400, request);
      }
      const slug = slugify(actor.name);

      const { data, error } = await supabase
        .from('actors')
        .insert({
          name: actor.name,
          slug: slug,
          avatar_url: actor.image || '',
          bio: actor.bio || 'Thông tin về nghệ sĩ này đang được cập nhật.',
          tmdb_id: actor.tmdb_id ? Number(actor.tmdb_id) : null
        })
        .select('*')
        .single();

      if (error) throw error;

      return apiResponse(data, 'success', 'Thêm diễn viên thành công!', 200, request);
    }

    if (action === 'update') {
      if (!actor || !actor.id || !actor.name) {
        return apiResponse(null, 'error', 'Thiếu thông tin cập nhật diễn viên!', 400, request);
      }

      // 1. Get the old name of the actor first
      const { data: oldActor, error: fetchError } = await supabase
        .from('actors')
        .select('name')
        .eq('id', actor.id)
        .single();

      if (fetchError) throw fetchError;
      const oldName = oldActor?.name;
      const newName = actor.name;

      // 2. Update actors table (DO NOT change the slug)
      const { data, error } = await supabase
        .from('actors')
        .update({
          name: newName,
          avatar_url: actor.image || '',
          bio: actor.bio || 'Thông tin về nghệ sĩ này đang được cập nhật.',
          tmdb_id: actor.tmdb_id ? Number(actor.tmdb_id) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', actor.id)
        .select('*')
        .single();

      if (error) throw error;

      // 3. If name is modified, update it in movies table
      if (oldName && oldName !== newName) {
        // Query movies that might contain the old actor name
        const { data: moviesToUpdate } = await supabase
          .from('movies')
          .select('id, actors');

        if (moviesToUpdate && moviesToUpdate.length > 0) {
          for (const m of moviesToUpdate) {
            if (Array.isArray(m.actors) && m.actors.includes(oldName)) {
              const updatedActors = m.actors.map((a: string) => a === oldName ? newName : a);
              await supabase
                .from('movies')
                .update({ actors: updatedActors })
                .eq('id', m.id);
            }
          }
        }
      }

      return apiResponse(data, 'success', 'Cập nhật diễn viên thành công!', 200, request);
    }

    if (action === 'delete') {
      if (!actor || !actor.id) {
        return apiResponse(null, 'error', 'Thiếu ID diễn viên để xóa!', 400, request);
      }

      // First delete references in movie_actors
      await supabase
        .from('movie_actors')
        .delete()
        .eq('actor_id', actor.id);

      const { error } = await supabase
        .from('actors')
        .delete()
        .eq('id', actor.id);

      if (error) throw error;

      return apiResponse({ success: true }, 'success', 'Xóa diễn viên thành công!', 200, request);
    }

    if (action === 'fetch-tmdb-info') {
      const { name, tmdb_id } = actor || {};
      if (!name && !tmdb_id) {
        return apiResponse(null, 'error', 'Thiếu tên hoặc TMDB ID để tìm kiếm!', 400, request);
      }

      const settings = await SettingService.getSettings();
      const apiKey = (settings.general as any).tmdb_api_key || '211be8d45c0d31404f644ecdcf9caad5';

      let bestMatchId = tmdb_id ? Number(tmdb_id) : null;

      if (!bestMatchId && name) {
        const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(name)}&language=vi-VN`;
        const res = await fetch(searchUrl);
        if (res.ok) {
          const searchData = await res.json() as any;
          bestMatchId = searchData.results?.[0]?.id;
        }
      }

      if (!bestMatchId) {
        // Fallback: tìm trên Wikipedia
        const wikiInfo = await fetchActorFromWikipedia(name || '');
        if (wikiInfo && (wikiInfo.avatarUrl || wikiInfo.bio)) {
          return apiResponse({
            name: name,
            tmdb_id: null,
            avatar_url: wikiInfo.avatarUrl,
            bio: wikiInfo.bio,
            source: 'wikipedia'
          }, 'success', 'Lấy thông tin từ Wikipedia thành công!', 200, request);
        }
        return apiResponse(null, 'error', 'Không tìm thấy diễn viên trên TMDB và Wikipedia!', 404, request);
      }

      const detailUrl = `https://api.themoviedb.org/3/person/${bestMatchId}?api_key=${apiKey}&language=vi-VN`;
      const detailRes = await fetch(detailUrl);
      if (!detailRes.ok) {
        return apiResponse(null, 'error', 'Lỗi khi lấy chi tiết từ TMDB!', 500, request);
      }
      let detailData = await detailRes.json() as any;

      if (!detailData.biography) {
        const enDetailUrl = `https://api.themoviedb.org/3/person/${bestMatchId}?api_key=${apiKey}&language=en-US`;
        const enRes = await fetch(enDetailUrl);
        if (enRes.ok) {
          const enData = await enRes.json() as any;
          if (enData.biography) {
            detailData = enData;
          }
        }
      }

      return apiResponse({
        name: detailData.name || name,
        tmdb_id: bestMatchId,
        avatar_url: detailData.profile_path ? `https://image.tmdb.org/t/p/h632${detailData.profile_path}` : '',
        bio: detailData.biography || ''
      }, 'success', 'Lấy thông tin TMDB thành công!', 200, request);
    }

    if (action === 'sync-single') {
      if (!actor || !actor.id) {
        return apiResponse(null, 'error', 'Thiếu ID diễn viên để đồng bộ!', 400, request);
      }

      const { data: dbActor, error: dbError } = await supabase
        .from('actors')
        .select('*')
        .eq('id', actor.id)
        .single();

      if (dbError || !dbActor) {
        return apiResponse(null, 'error', 'Không tìm thấy diễn viên trong DB!', 404, request);
      }

      const settings = await SettingService.getSettings();
      const apiKey = (settings.general as any).tmdb_api_key;
      if (!apiKey) {
        return apiResponse(null, 'error', 'Chưa cấu hình TMDB API Key!', 400, request);
      }

      let bestMatchId = dbActor.tmdb_id;

      if (!bestMatchId) {
        const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(dbActor.name)}&language=vi-VN`;
        const res = await fetch(searchUrl);
        if (res.ok) {
          const searchData = await res.json() as any;
          bestMatchId = searchData.results?.[0]?.id;
        }
      }

      if (!bestMatchId) {
        // Fallback: tìm trên Wikipedia
        const wikiInfo = await fetchActorFromWikipedia(dbActor.name);
        if (wikiInfo && (wikiInfo.avatarUrl || wikiInfo.bio)) {
          const { data: wikiUpdated, error: wikiErr } = await supabase
            .from('actors')
            .update({
              avatar_url: wikiInfo.avatarUrl || dbActor.avatar_url,
              bio: wikiInfo.bio || dbActor.bio,
              updated_at: new Date().toISOString()
            })
            .eq('id', actor.id)
            .select('*')
            .single();

          if (wikiErr) throw wikiErr;

          return apiResponse({
            id: wikiUpdated.id,
            name: wikiUpdated.name,
            image: wikiUpdated.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80',
            slug: wikiUpdated.slug,
            bio: wikiUpdated.bio,
            tmdb_id: wikiUpdated.tmdb_id,
            source: 'wikipedia'
          }, 'success', 'Đồng bộ diễn viên từ Wikipedia thành công!', 200, request);
        }
        return apiResponse(null, 'error', 'Không tìm thấy diễn viên trên TMDB và Wikipedia!', 404, request);
      }

      const detailUrl = `https://api.themoviedb.org/3/person/${bestMatchId}?api_key=${apiKey}&language=vi-VN`;
      const detailRes = await fetch(detailUrl);
      if (!detailRes.ok) {
        return apiResponse(null, 'error', 'Lỗi khi lấy chi tiết từ TMDB!', 500, request);
      }
      let detailData = await detailRes.json() as any;

      if (!detailData.biography) {
        const enDetailUrl = `https://api.themoviedb.org/3/person/${bestMatchId}?api_key=${apiKey}&language=en-US`;
        const enRes = await fetch(enDetailUrl);
        if (enRes.ok) {
          const enData = await enRes.json() as any;
          if (enData.biography) {
            detailData = enData;
          }
        }
      }

      const avatarUrl = detailData.profile_path ? `https://image.tmdb.org/t/p/h632${detailData.profile_path}` : dbActor.avatar_url;
      const bio = detailData.biography || dbActor.bio;

      const { data: updated, error: updateErr } = await supabase
        .from('actors')
        .update({
          tmdb_id: bestMatchId,
          avatar_url: avatarUrl,
          bio: bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', actor.id)
        .select('*')
        .single();

      if (updateErr) throw updateErr;

      return apiResponse({
        id: updated.id,
        name: updated.name,
        image: updated.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80',
        slug: updated.slug,
        bio: updated.bio,
        tmdb_id: updated.tmdb_id
      }, 'success', 'Đồng bộ diễn viên thành công!', 200, request);
    }

    if (action === 'sync-batch') {
      const settings = await SettingService.getSettings();
      const apiKey = (settings.general as any).tmdb_api_key;
      if (!apiKey) {
        return apiResponse(null, 'error', 'Chưa cấu hình TMDB API Key!', 400, request);
      }

      const { data: actorsToSync, error: dbError } = await supabase
        .from('actors')
        .select('*')
        .or('tmdb_id.is.null,bio.eq.Thông tin về nghệ sĩ này đang được cập nhật.,bio.is.null,avatar_url.eq.,avatar_url.like.%unsplash%')
        .limit(30);

      if (dbError) throw dbError;

      if (!actorsToSync || actorsToSync.length === 0) {
        return apiResponse({ count: 0 }, 'success', 'Không tìm thấy diễn viên nào cần đồng bộ.', 200, request);
      }

      let count = 0;
      for (const a of actorsToSync) {
        try {
          let bestMatchId = a.tmdb_id;
          if (!bestMatchId) {
            const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(a.name)}&language=vi-VN`;
            const res = await fetch(searchUrl);
            if (res.ok) {
              const searchData = await res.json() as any;
              bestMatchId = searchData.results?.[0]?.id;
            }
          }

          if (!bestMatchId) {
            // Fallback: tìm trên Wikipedia
            const wikiInfo = await fetchActorFromWikipedia(a.name);
            if (wikiInfo && (wikiInfo.avatarUrl || wikiInfo.bio)) {
              await supabase
                .from('actors')
                .update({
                  avatar_url: wikiInfo.avatarUrl || a.avatar_url,
                  bio: wikiInfo.bio || a.bio,
                  updated_at: new Date().toISOString()
                })
                .eq('id', a.id);
              count++;
            }
            continue;
          }

          const detailUrl = `https://api.themoviedb.org/3/person/${bestMatchId}?api_key=${apiKey}&language=vi-VN`;
          const detailRes = await fetch(detailUrl);
          if (!detailRes.ok) continue;
          let detailData = await detailRes.json() as any;

          if (!detailData.biography) {
            const enDetailUrl = `https://api.themoviedb.org/3/person/${bestMatchId}?api_key=${apiKey}&language=en-US`;
            const enRes = await fetch(enDetailUrl);
            if (enRes.ok) {
              const enData = await enRes.json() as any;
              if (enData.biography) {
                detailData = enData;
              }
            }
          }

          const avatarUrl = detailData.profile_path ? `https://image.tmdb.org/t/p/h632${detailData.profile_path}` : a.avatar_url;
          const bio = detailData.biography || a.bio;

          await supabase
            .from('actors')
            .update({
              tmdb_id: bestMatchId,
              avatar_url: avatarUrl,
              bio: bio,
              updated_at: new Date().toISOString()
            })
            .eq('id', a.id);

          count++;
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (e) {
          console.error(`Lỗi khi đồng bộ diễn viên ${a.name}:`, e);
        }
      }

      return apiResponse({ count }, 'success', `Đồng bộ thành công ${count} diễn viên!`, 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
