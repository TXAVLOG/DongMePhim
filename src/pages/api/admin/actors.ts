import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

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
      bio: a.bio
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
          bio: actor.bio || 'Thông tin về nghệ sĩ này đang được cập nhật.'
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

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
