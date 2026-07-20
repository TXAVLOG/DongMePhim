import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

// In-memory active session tracker (sid -> timestamp ms)
const activeSessions = new Map<string, number>();

// In-memory cache for visits stats
let cachedStats = {
  today_date: new Date().toISOString().split('T')[0],
  today_visits: 1250,
  total_visits: 384500,
  last_saved: Date.now()
};

function getStatsFilePath() {
  return path.resolve(process.cwd(), 'src/data/site_stats.json');
}

function loadStats() {
  const filePath = getStatsFilePath();
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (data.today_date !== todayStr) {
        data.today_date = todayStr;
        data.today_visits = 0;
      }
      cachedStats = { ...cachedStats, ...data };
    } else {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(cachedStats, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('Lỗi nạp site_stats.json:', e);
  }
}

function saveStats() {
  try {
    const filePath = getStatsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(cachedStats, null, 2), 'utf-8');
  } catch (e) {
    console.error('Lỗi ghi site_stats.json:', e);
  }
}

// Load initial stats
loadStats();

export const ALL: APIRoute = async ({ request, url }) => {
  const now = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Kiểm tra sang ngày mới để reset today_visits
  if (cachedStats.today_date !== todayStr) {
    cachedStats.today_date = todayStr;
    cachedStats.today_visits = 0;
    saveStats();
  }

  // 2. Lấy session ID từ query param hoặc body
  let sid = url.searchParams.get('sid');
  let isNew = url.searchParams.get('new') === '1';

  if (!sid && request.method === 'POST') {
    try {
      const body: any = await request.json();
      if (body) {
        sid = body.sid || sid;
        isNew = body.new === true || isNew;
      }
    } catch (e) {}
  }

  if (sid) {
    const cleanSid = String(sid).trim();
    const isFirstTime = !activeSessions.has(cleanSid);

    activeSessions.set(cleanSid, now);

    // Nếu là phiên truy cập mới hoặc lần đầu mở trang
    if (isNew || isFirstTime) {
      cachedStats.today_visits += 1;
      cachedStats.total_visits += 1;

      // Lưu đĩa sau mỗi 10 giây hoặc khi có thay đổi
      if (now - cachedStats.last_saved > 10000) {
        cachedStats.last_saved = now;
        saveStats();
      }
    }
  }

  // 3. Dọn dẹp các session quá 30 giây không gửi heartbeat
  for (const [sKey, lastPing] of activeSessions.entries()) {
    if (now - lastPing > 30000) {
      activeSessions.delete(sKey);
    }
  }

  const onlineCount = activeSessions.size;

  return new Response(
    JSON.stringify({
      status: 'success',
      data: {
        todayVisits: cachedStats.today_visits,
        totalVisits: cachedStats.total_visits,
        onlineUsers: Math.max(1, onlineCount)
      }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    }
  );
};
