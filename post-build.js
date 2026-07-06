import fs from 'fs';
import path from 'path';

const entryPath = path.resolve('dist/server/entry.mjs');
if (fs.existsSync(entryPath)) {
  let content = fs.readFileSync(entryPath, 'utf8');
  if (!content.includes('export const scheduled')) {
    const secret = 'txa-cron-kkphim-2026-secure';
    const scheduledCode = `
export const scheduled = async (controller, env, ctx) => {
  console.log('[Cron] Cloudflare scheduled event triggered:', controller.scheduledTime, 'Cron:', controller.cron);
  try {
    const secret = '${secret}';
    
    if (controller.cron === '0 0 * * *') {
      // 7:00 AM VN time (00:00 UTC) - Run crawl-new-movies
      console.log('[Cron] Executing crawl-new-movies...');
      const urlCrawl = 'https://dongmephim.online/api/cron/crawl-new-movies?secret=' + secret;
      try {
        const resCrawl = await w.fetch(new Request(urlCrawl), env, ctx);
        console.log('[Cron] crawl-new-movies result status:', resCrawl.status);
      } catch (errCrawl) {
        console.error('[Cron] Error running crawl-new-movies:', errCrawl);
      }
    } else {
      // 15-minute intervals between 12:00 PM and 12:00 AM - Run sync-kkphim and membership-check
      console.log('[Cron] Executing standard sync and membership checks...');
      const url1 = 'https://dongmephim.online/api/cron/sync-kkphim?secret=' + secret;
      const url2 = 'https://dongmephim.online/api/cron/membership-check?secret=' + secret;
      
      try {
        const res1 = await w.fetch(new Request(url1), env, ctx);
        console.log('[Cron] sync-kkphim result status:', res1.status);
      } catch (err1) {
        console.error('[Cron] Error running sync-kkphim:', err1);
      }
      
      try {
        const res2 = await w.fetch(new Request(url2), env, ctx);
        console.log('[Cron] membership-check result status:', res2.status);
      } catch (err2) {
        console.error('[Cron] Error running membership-check:', err2);
      }
    }
  } catch (err) {
    console.error('[Cron] Error running scheduled event:', err);
  }
};
`;
    content += scheduledCode;
    fs.writeFileSync(entryPath, content, 'utf8');
    console.log('Successfully injected scheduled handler to dist/server/entry.mjs');
  } else {
    console.log('scheduled handler already injected in entry.mjs');
  }
} else {
  console.error('entry.mjs not found at', entryPath);
}
