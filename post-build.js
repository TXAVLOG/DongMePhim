import fs from 'fs';
import path from 'path';

let entryPath = path.resolve('dist/server/entry.mjs');
if (!fs.existsSync(entryPath)) {
  entryPath = path.resolve('dist/_worker.js');
}
if (fs.existsSync(entryPath)) {
  let content = fs.readFileSync(entryPath, 'utf8');

  // Remove any previously injected named export scheduled (from old post-build)
  content = content.replace(/\nexport const scheduled\s*=[\s\S]*?;\s*$/m, '');

  // Check if scheduled is already on the default export object
  if (content.includes('.scheduled')) {
    console.log('scheduled handler already present on default export.');
  } else {
    const secret = 'txa-cron-kkphim-2026-secure';

    // Strategy: replace `export { w as default }` with a new default export
    // that wraps the original worker entry AND adds the scheduled handler.
    // The variable `w` is `workerEntry` which is `{ fetch: handle }`.

    const oldExportPattern = /export\s*\{\s*(\w+)\s+as\s+default\s*\}/;
    const match = content.match(oldExportPattern);

    if (match) {
      const varName = match[0]; // e.g. "export { w as default }"
      const workerVar = match[1]; // e.g. "w"

      const replacement = `
const __scheduled_handler = async (controller, env, ctx) => {
  console.log('[Cron] Cloudflare scheduled event triggered:', controller.scheduledTime, 'Cron:', controller.cron);
  try {
    const cronSecret = '${secret}';

    if (controller.cron === '30 18 * * *') {
      // 1:30 AM VN time (18:30 UTC) - Run ALL 3 tasks sequentially with progress
      console.log('[Cron 1:30AM] ═══════════════════════════════════════');
      console.log('[Cron 1:30AM] Bắt đầu chạy toàn bộ 3 tác vụ hàng ngày...');
      const allStartTime = Date.now();
      const taskResults = {};

      // Task 1: sync-kkphim
      console.log('[Cron 1:30AM] [1/3] Đang chạy sync-kkphim...');
      const urlSync = 'https://dongmephim.online/api/cron/sync-kkphim?secret=' + cronSecret + '&limit=10&resume=true';
      try {
        const resSync = await ${workerVar}.fetch(new Request(urlSync), env, ctx);
        taskResults['sync-kkphim'] = resSync.status;
        console.log('[Cron 1:30AM] [1/3] sync-kkphim hoàn tất, status:', resSync.status);
      } catch (errSync) {
        taskResults['sync-kkphim'] = 'error';
        console.error('[Cron 1:30AM] [1/3] sync-kkphim LỖI:', errSync);
      }

      // Task 2: crawl-new-movies
      console.log('[Cron 1:30AM] [2/3] Đang chạy crawl-new-movies...');
      const urlCrawl = 'https://dongmephim.online/api/cron/crawl-new-movies?secret=' + cronSecret;
      try {
        const resCrawl = await ${workerVar}.fetch(new Request(urlCrawl), env, ctx);
        taskResults['crawl-new-movies'] = resCrawl.status;
        console.log('[Cron 1:30AM] [2/3] crawl-new-movies hoàn tất, status:', resCrawl.status);
      } catch (errCrawl) {
        taskResults['crawl-new-movies'] = 'error';
        console.error('[Cron 1:30AM] [2/3] crawl-new-movies LỖI:', errCrawl);
      }

      // Task 3: membership-check
      console.log('[Cron 1:30AM] [3/3] Đang chạy membership-check...');
      const urlMember = 'https://dongmephim.online/api/cron/membership-check?secret=' + cronSecret;
      try {
        const resMember = await ${workerVar}.fetch(new Request(urlMember), env, ctx);
        taskResults['membership-check'] = resMember.status;
        console.log('[Cron 1:30AM] [3/3] membership-check hoàn tất, status:', resMember.status);
      } catch (errMember) {
        taskResults['membership-check'] = 'error';
        console.error('[Cron 1:30AM] [3/3] membership-check LỖI:', errMember);
      }

      const totalElapsed = ((Date.now() - allStartTime) / 1000).toFixed(1);
      console.log('[Cron 1:30AM] ═══════════════════════════════════════');
      console.log('[Cron 1:30AM] Hoàn tất tất cả 3 tác vụ trong ' + totalElapsed + 's');
      console.log('[Cron 1:30AM] Kết quả:', JSON.stringify(taskResults));

    } else if (controller.cron === '0 0 * * *') {
      // 7:00 AM VN time (00:00 UTC) - Run crawl-new-movies
      console.log('[Cron] Executing crawl-new-movies...');
      const urlCrawl = 'https://dongmephim.online/api/cron/crawl-new-movies?secret=' + cronSecret;
      try {
        const resCrawl = await ${workerVar}.fetch(new Request(urlCrawl), env, ctx);
        console.log('[Cron] crawl-new-movies result status:', resCrawl.status);
      } catch (errCrawl) {
        console.error('[Cron] Error running crawl-new-movies:', errCrawl);
      }
    } else {
      // 15-minute intervals - Run sync-kkphim and membership-check
      console.log('[Cron] Executing standard sync and membership checks...');
      const url1 = 'https://dongmephim.online/api/cron/sync-kkphim?secret=' + cronSecret + '&cron=true';
      const url2 = 'https://dongmephim.online/api/cron/membership-check?secret=' + cronSecret;

      try {
        const res1 = await ${workerVar}.fetch(new Request(url1), env, ctx);
        console.log('[Cron] sync-kkphim result status:', res1.status);
      } catch (err1) {
        console.error('[Cron] Error running sync-kkphim:', err1);
      }

      try {
        const res2 = await ${workerVar}.fetch(new Request(url2), env, ctx);
        console.log('[Cron] membership-check result status:', res2.status);
      } catch (err2) {
        console.error('[Cron] Error running membership-check:', err2);
      }
    }
  } catch (err) {
    console.error('[Cron] Error running scheduled event:', err);
  }
};

const __default_with_scheduled = {
  fetch: ${workerVar}.fetch,
  scheduled: __scheduled_handler
};
export { __default_with_scheduled as default };
`;
      content = content.replace(oldExportPattern, replacement);
      fs.writeFileSync(entryPath, content, 'utf8');
      console.log('Successfully injected scheduled handler INTO default export of dist/server/entry.mjs');
    } else {
      console.error('Could not find "export { ... as default }" pattern in entry.mjs');
      console.log('First 500 chars:', content.substring(0, 500));
    }
  }
} else {
  console.error('entry.mjs not found at', entryPath);
}
