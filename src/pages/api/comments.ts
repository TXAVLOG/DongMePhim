import type { APIRoute } from 'astro';
import { apiResponse } from '../../lib/api/response';
import { supabase } from '../../lib/supabase';

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
    if (authorNames.length > 0) {
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('username, name, gender, package')
          .or(`name.in.(${authorNames.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',')}),username.in.(${authorNames.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',')})`);
        
        if (usersData) {
          usersData.forEach((u: any) => {
            const pkg = u.package || 'Free';
            if (u.name) {
              const key = u.name.toLowerCase().trim();
              userGenderMap.set(key, u.gender || 'other');
              userPackageMap.set(key, pkg);
            }
            if (u.username) {
              const key = u.username.toLowerCase().trim();
              userGenderMap.set(key, u.gender || 'other');
              userPackageMap.set(key, pkg);
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
        package: userPackageMap.get(r.author?.toLowerCase().trim()) || 'Free'
      })) : [];

      return {
        id: c.id,
        author: c.author,
        content: c.content,
        likes: Number(c.likes) || 0,
        dislikes: 0,
        gender: userGenderMap.get(c.author?.toLowerCase().trim()) || 'other',
        package: userPackageMap.get(c.author?.toLowerCase().trim()) || 'Free',
        replies: replies,
        createdAt: c.created_at,
        movieSlug: c.movie_slug
      };
    });

    // Giới hạn 10 bình luận gần nhất nếu là query trang chủ (không truyền slug)
    if (!slug) {
      commentsList = commentsList.slice(0, 10);
    }

    // Seed data mẫu nếu cơ sở dữ liệu trống cho phim cụ thể này
    if (slug && commentsList.length === 0) {
      commentsList = [
        {
          id: 'seed-1',
          author: 'Hoàng Nam',
          content: 'Tập mới cuốn ghê, không uổng công ngóng cả tuần trời. Web dịch siêu chất lượng nha!',
          likes: 12,
          dislikes: 0,
          gender: 'male',
          package: 'Free',
          replies: [
            {
              id: 'seed-reply-1',
              author: 'Cô 3 Rổ',
              content: 'Cảm ơn bạn đã ủng hộ web nha! Nhớ giới thiệu cho bạn bè cùng xem nha bạn.',
              createdAt: new Date(Date.now() - 3600000).toISOString()
            }
          ],
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          movieSlug: slug
        },
        {
          id: 'seed-2',
          author: 'Khánh Linh',
          content: 'Phim này càng xem càng cuốn, mong chờ tập sau quá đi thôiiii',
          likes: 8,
          dislikes: 0,
          gender: 'female',
          package: 'Free',
          replies: [],
          createdAt: new Date(Date.now() - 14400000).toISOString(),
          movieSlug: slug
        }
      ];
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

    const { action, slug, author, content, commentId, replyAuthor, replyContent } = body;

    // 1. Thích bình luận (Action: like)
    if (action === 'like') {
      if (!commentId) {
        return apiResponse(null, 'error', 'Thiếu ID bình luận!', 400, request);
      }

      // Lấy số lượt thích hiện tại
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

      // Lấy bình luận gốc để đọc mảng replies hiện tại
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

    // 3. Đăng bình luận mới
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
      replies: []
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
      createdAt: insertedData.created_at
    }, 'success', 'Đăng bình luận thành công!', 200, request);

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
