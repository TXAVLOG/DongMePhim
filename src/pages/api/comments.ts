import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

// GET: Lấy danh sách bình luận (theo phim hoặc toàn bộ gần đây)
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    let query = supabase.from('txa_comments').select('*');

    if (slug) {
      query = query.eq('movie_slug', slug);
    }

    // Sắp xếp bình luận mới nhất lên đầu
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch user packages & genders
    const authorNamesSet = new Set<string>();
    (data || []).forEach((c: any) => {
      if (c.author) authorNamesSet.add(c.author);
      if (Array.isArray(c.replies)) {
        c.replies.forEach((r: any) => {
          if (r.author) authorNamesSet.add(r.author);
        });
      }
    });
    const authorNames = Array.from(authorNamesSet).filter(Boolean);
    const userGenderMap = new Map<string, string>();
    const userPackageMap = new Map<string, string>();
    const userRoleMap = new Map<string, string>();
    const userAvatarMap = new Map<string, string>();
    if (authorNames.length > 0) {
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('username, name, gender, package, role, avatar')
          .or(`name.in.(${authorNames.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',')}),username.in.(${authorNames.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',')})`);
        
        if (usersData) {
          usersData.forEach((u: any) => {
            const pkg = u.package || 'Free';
            const role = u.role || 'user';
            const avatar = u.avatar || '';
            if (u.name) {
              const key = u.name.toLowerCase().trim();
              userGenderMap.set(key, u.gender || 'other');
              userPackageMap.set(key, pkg);
              userRoleMap.set(key, role);
              userAvatarMap.set(key, avatar);
            }
            if (u.username) {
              const key = u.username.toLowerCase().trim();
              userGenderMap.set(key, u.gender || 'other');
              userPackageMap.set(key, pkg);
              userRoleMap.set(key, role);
              userAvatarMap.set(key, avatar);
            }
          });
        }
      } catch (e) {
        console.error("Lỗi khi lấy giới tính/gói cước của các tác giả:", e);
      }
    }

    let commentsList = (data || []).map((c: any) => {
      const replies = Array.isArray(c.replies) ? c.replies.map((r: any) => ({
        ...r,
        package: userPackageMap.get(r.author?.toLowerCase().trim()) || 'Free',
        gender: userGenderMap.get(r.author?.toLowerCase().trim()) || 'other',
        role: userRoleMap.get(r.author?.toLowerCase().trim()) || 'user'
      })) : [];

      return {
        id: c.id,
        author: c.author,
        content: c.content,
        likes: Number(c.likes) || 0,
        dislikes: 0,
        gender: userGenderMap.get(c.author?.toLowerCase().trim()) || 'other',
        package: userPackageMap.get(c.author?.toLowerCase().trim()) || 'Free',
        role: userRoleMap.get(c.author?.toLowerCase().trim()) || 'user',
        avatar: userAvatarMap.get(c.author?.toLowerCase().trim()) || c.avatar || '',
        replies: replies,
        createdAt: c.created_at,
        movieSlug: c.movie_slug,
        episodeName: c.episode_name || '',
        serverName: c.server_name || '',
        isSpoiler: !!c.is_spoiler,
        isReported: !!c.is_reported
      };
    });

    // Giới hạn 10 bình luận gần nhất nếu là query trang chủ (không truyền slug)
    if (!slug) {
      commentsList = commentsList.slice(0, 10);
    }

    return apiResponse(commentsList, 'success', 'Lấy bình luận thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Thêm bình luận, trả lời hoặc thích bình luận
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { action, slug, author, content, commentId, replyAuthor, replyContent, episodeName, serverName, isSpoiler } = body;

    // 1. Thích bình luận (Action: like)
    if (action === 'like') {
      if (!commentId) {
        return apiResponse(null, 'error', 'Thiếu ID bình luận!', 400, request);
      }

      const { data: curData, error: fetchErr } = await supabase
        .from('txa_comments')
        .select('likes')
        .eq('id', commentId)
        .maybeSingle();

      if (fetchErr || !curData) {
        return apiResponse(null, 'error', 'Không tìm thấy bình luận để thích!', 404, request);
      }

      const newLikes = (Number(curData.likes) || 0) + 1;

      const { error: updateErr } = await supabase
        .from('txa_comments')
        .update({ likes: newLikes })
        .eq('id', commentId);

      if (updateErr) throw updateErr;

      return apiResponse({ likes: newLikes }, 'success', 'Đã thích bình luận!', 200, request);
    }

    // 2. Trả lời bình luận (Action: reply)
    if (action === 'reply') {
      if (!commentId) {
        return apiResponse(null, 'error', 'Thiếu ID bình luận!', 400, request);
      }
      if (!replyContent || !replyContent.trim()) {
        return apiResponse(null, 'error', 'Nội dung trả lời không được để trống!', 400, request);
      }

      const { data: curData, error: fetchErr } = await supabase
        .from('txa_comments')
        .select('replies')
        .eq('id', commentId)
        .maybeSingle();

      if (fetchErr || !curData) {
        return apiResponse(null, 'error', 'Không tìm thấy bình luận để trả lời!', 404, request);
      }

      const replies = Array.isArray(curData.replies) ? curData.replies : [];
      const newReply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        author: (replyAuthor || 'Ẩn danh').trim(),
        content: replyContent.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedReplies = [...replies, newReply];

      const { error: updateErr } = await supabase
        .from('txa_comments')
        .update({ replies: updatedReplies })
        .eq('id', commentId);

      if (updateErr) throw updateErr;

      return apiResponse(newReply, 'success', 'Đã trả lời bình luận!', 200, request);
    }

    // 3. Xóa bình luận
    if (action === 'delete') {
      if (!commentId) {
        return apiResponse(null, 'error', 'Thiếu ID bình luận!', 400, request);
      }

      const { error } = await supabase
        .from('txa_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      return apiResponse({ success: true }, 'success', 'Xóa bình luận thành công!', 200, request);
    }

    // 4. Toggle Tiết lộ nội dung (Spoiler)
    if (action === 'toggle_spoiler') {
      if (!commentId) {
        return apiResponse(null, 'error', 'Thiếu ID bình luận!', 400, request);
      }

      const { data: curData, error: fetchErr } = await supabase
        .from('txa_comments')
        .select('is_spoiler')
        .eq('id', commentId)
        .maybeSingle();

      if (fetchErr || !curData) {
        return apiResponse(null, 'error', 'Bình luận không tồn tại!', 404, request);
      }

      const nextVal = !curData.is_spoiler;
      const { error } = await supabase
        .from('txa_comments')
        .update({ is_spoiler: nextVal })
        .eq('id', commentId);

      if (error) throw error;

      return apiResponse({ isSpoiler: nextVal }, 'success', 'Cập nhật tag tiết lộ nội dung thành công!', 200, request);
    }

    // 5. Đăng bình luận mới
    if (!slug) {
      return apiResponse(null, 'error', 'Thiếu slug phim!', 400, request);
    }
    if (!content || !content.trim()) {
      return apiResponse(null, 'error', 'Nội dung bình luận không được để trống!', 400, request);
    }

    const newComment = {
      movie_slug: slug,
      author: (author || 'Ẩn danh').trim(),
      content: content.trim(),
      likes: 0,
      replies: [],
      episode_name: episodeName || null,
      server_name: serverName || null,
      is_spoiler: isSpoiler === true || isSpoiler === 'true'
    };

    const { data: insertedData, error: insertErr } = await supabase
      .from('txa_comments')
      .insert(newComment)
      .select()
      .single();

    if (insertErr) throw insertErr;

    return apiResponse({
      id: insertedData.id,
      author: insertedData.author,
      content: insertedData.content,
      likes: insertedData.likes,
      dislikes: 0,
      replies: insertedData.replies,
      createdAt: insertedData.created_at,
      episodeName: insertedData.episode_name || '',
      serverName: insertedData.server_name || '',
      isSpoiler: !!insertedData.is_spoiler
    }, 'success', 'Đăng bình luận thành công!', 200, request);

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

