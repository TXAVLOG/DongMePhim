import type { APIRoute } from 'astro';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async ({ url }) => {
  const settings = await SettingService.getSettings();
  const siteUrl = settings.general?.site_url || `${url.protocol}//${url.host}`;
  const cleanSiteUrl = siteUrl.replace(/\/$/, '');

  const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/admin/

Sitemap: ${cleanSiteUrl}/sitemap.xml
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
