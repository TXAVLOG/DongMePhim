import type { APIRoute } from 'astro';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async ({ url }) => {
  const host = url.hostname || '';
  if (host.startsWith('api.')) {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
      }
    });
  }

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
