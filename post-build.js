import fs from 'fs';
import path from 'path';

const entryPath = path.resolve('dist/server/entry.mjs');
if (fs.existsSync(entryPath)) {
  let content = fs.readFileSync(entryPath, 'utf8');
  if (!content.includes('export const scheduled')) {
    const secret = 'txa-cron-kkphim-2026-secure';
    const scheduledCode = `
export const scheduled = async (controller, env, ctx) => {
  console.log('[Cron] Cloudflare scheduled event triggered:', controller.scheduledTime);
  try {
    const url1 = 'https://dongmephim.online/api/cron/sync-kkphim?secret=${secret}';
    const url2 = 'https://dongmephim.online/api/cron/membership-check?secret=${secret}';
    
    // Execute both cron jobs concurrently and locally using Astro's server fetch handler
    const res1 = await w.fetch(new Request(url1), env, ctx);
    console.log('[Cron] sync-kkphim result status:', res1.status);
    
    const res2 = await w.fetch(new Request(url2), env, ctx);
    console.log('[Cron] membership-check result status:', res2.status);
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
