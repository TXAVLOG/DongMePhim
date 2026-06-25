import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';

// GET: Lấy danh sách phim yêu thích và danh sách phát từ Supabase
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const username = url.searchParams.get('username');
    if (!username) {
      return apiResponse({ favorites: [], playlist: [] }, 'success', '', 200, request);
    }

    // 1. Lấy user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    if (userError || !user) {
      return apiResponse({ favorites: [], playlist: [] }, 'success', '', 200, request);
    }

    // 2. Lấy danh sách từ watch_lists
    const { data, error } = await supabase
      .from('watch_lists')
      .select(`
        type,
        movies (
          slug
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    const favorites: string[] = [];
    const playlist: string[] = [];

    (data || []).forEach((item: any) => {
      if (item.movies && item.movies.slug) {
        if (item.type === 'favorite') {
          favorites.push(item.movies.slug);
        } else {
          playlist.push(item.movies.slug);
        }
      }
    });

    return apiResponse({ favorites, playlist }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse({ favorites: [], playlist: [] }, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Thêm phim vào danh sách phát hoặc yêu thích
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as any;
    const { username, slug, type } = body; // type is either 'favorite' or 'playlist'

    if (!username || !slug || !type) {
      return apiResponse(null, 'error', 'Missing username, slug or type', 400, request);
    }

    // 1. Lấy user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, package')
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    if (userError || !user) {
      return apiResponse(null, 'error', 'User not found', 404, request);
    }

    // 2. Lấy movie_id
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (movieError || !movie) {
      return apiResponse(null, 'error', 'Movie not found', 404, request);
    }

    // Check count limits
    const settings = await SettingService.getSettings();
    const userPackage = user.package || 'free';
    const packages = settings.packages || [];
    const userPkg: any = packages.find((p: any) => p.id === userPackage) || packages.find((p: any) => p.title === userPackage) || packages.find((p: any) => p.id === 'free') || {};
    const maxPlaylists = userPkg.permissions?.max_playlists ?? 10;

    const { data: existingItem } = await supabase
      .from('watch_lists')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('movie_id', movie.id)
      .eq('type', type)
      .maybeSingle();

    if (!existingItem) {
      const { count, error: countError } = await supabase
        .from('watch_lists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', type);

      if (countError) throw countError;

      if (count !== null && count >= maxPlaylists) {
        return apiResponse(null, 'error', `Đã đạt giới hạn tối đa ${maxPlaylists} phim trong danh sách. Vui lòng nâng cấp gói cước để lưu thêm!`, 403, request);
      }
    }

    // 3. Chèn vào watch_lists
    const { error } = await supabase
      .from('watch_lists')
      .upsert({
        user_id: user.id,
        movie_id: movie.id,
        type: type // 'favorite' or 'playlist'
      }, { onConflict: 'user_id,movie_id,type' });

    if (error) throw error;

    return apiResponse({ success: true }, 'success', 'Đã lưu thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// DELETE: Xóa phim khỏi danh sách phát hoặc yêu thích
export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const username = url.searchParams.get('username');
    const slug = url.searchParams.get('slug');
    const type = url.searchParams.get('type'); // 'favorite' or 'playlist'

    if (!username || !slug || !type) {
      return apiResponse(null, 'error', 'Missing username, slug or type', 400, request);
    }

    // 1. Lấy user_id
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    if (!user) {
      return apiResponse(null, 'error', 'User not found', 404, request);
    }

    // 2. Lấy movie_id
    const { data: movie } = await supabase
      .from('movies')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!movie) {
      return apiResponse(null, 'error', 'Movie not found', 404, request);
    }

    // 3. Xóa
    const { error } = await supabase
      .from('watch_lists')
      .delete()
      .eq('user_id', user.id)
      .eq('movie_id', movie.id)
      .eq('type', type);

    if (error) throw error;

    return apiResponse({ success: true }, 'success', 'Đã xóa thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
