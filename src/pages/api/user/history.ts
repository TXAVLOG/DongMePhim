import type { APIRoute } from 'astro';

// Safe JSON Parse helper
function safeJsonParse(str: string): any[] {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// GET: Lấy lịch sử xem online từ Cookie
export const GET: APIRoute = async ({ cookies }) => {
  const historyCookie = cookies.get('txa_online_history');
  const history = historyCookie ? safeJsonParse(historyCookie.value) : [];

  return new Response(JSON.stringify(history), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

// POST: Lưu hoặc cập nhật lịch sử xem online vào Cookie
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = (await request.json()) as any;
    const { slug, episodeSlug, episodeName, currentTime, duration, serverIndex, serverName, updatedAt, title, posterUrl } = body;

    if (!slug || !episodeSlug) {
      return new Response(JSON.stringify({ error: 'Missing slug or episodeSlug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Đọc lịch sử cũ
    const historyCookie = cookies.get('txa_online_history');
    let history = historyCookie ? safeJsonParse(historyCookie.value) : [];

    // Tạo bản ghi mới thu nhỏ để tối ưu dung lượng cookie (<4KB)
    const newRecord = {
      slug,
      episodeSlug,
      episodeName: episodeName || '',
      currentTime: parseFloat(currentTime) || 0,
      duration: parseFloat(duration) || 0,
      serverIndex: parseInt(serverIndex) || 0,
      serverName: serverName || 'Server VIP',
      updatedAt: updatedAt || new Date().toISOString(),
      title: title || '',
      posterUrl: posterUrl || ''
    };

    // Loại bỏ bản ghi cũ của phim này
    history = history.filter((item: any) => item.slug !== slug);

    // Chèn bản ghi mới vào đầu mảng
    history.unshift(newRecord);

    // Giới hạn tối đa 10 phim xem gần nhất để tránh tràn cookie
    history = history.slice(0, 10);

    // Lưu cookie (thời hạn 30 ngày)
    cookies.set('txa_online_history', JSON.stringify(history), {
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: false, // Để client-side JavaScript có thể đọc nếu cần
      secure: true,
      sameSite: 'lax'
    });

    return new Response(JSON.stringify({ success: true, history }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Xóa lịch sử xem
export const DELETE: APIRoute = async ({ request, url, cookies }) => {
  try {
    const slug = url.searchParams.get('slug');
    
    // Đọc lịch sử cũ
    const historyCookie = cookies.get('txa_online_history');
    let history = historyCookie ? safeJsonParse(historyCookie.value) : [];

    if (slug) {
      // Xóa cụ thể 1 phim
      history = history.filter((item: any) => item.slug !== slug);
      cookies.set('txa_online_history', JSON.stringify(history), {
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        secure: true,
        sameSite: 'lax'
      });
      return new Response(JSON.stringify({ success: true, message: `Deleted history for slug ${slug}`, history }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Xóa toàn bộ
      cookies.delete('txa_online_history', { path: '/' });
      return new Response(JSON.stringify({ success: true, message: 'Cleared all online history' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
