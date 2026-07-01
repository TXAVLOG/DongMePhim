import type { APIRoute } from 'astro';
import { MovieService } from '@services/MovieService';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async () => {
  // Fetch dynamic URL from settings
  const settings = await SettingService.getSettings();
  const siteUrl = settings.general.site_url.replace(/\/$/, ''); // Ensure no trailing slash

  // Fetch both movies and series for the sitemap
  const movies = await MovieService.getMovies({ type: 'movie', limit: 250 });
  const series = await MovieService.getMovies({ type: 'series', limit: 250 });
  const allMovies = [...movies, ...series]; 

  // Static routes
  const staticRoutes = [
    '',
    '/tphim',
    '/phim-le',
    '/phim-bo',
    '/phim-long-tieng',
    '/phim-tvb',
    '/lich-chieu',
    '/top-imdb'
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Add static routes
  staticRoutes.forEach(route => {
    xml += `  <url>\n`;
    xml += `    <loc>${siteUrl}${route}</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>${route === '' ? '1.0' : '0.8'}</priority>\n`;
    xml += `  </url>\n`;
  });

  // Add dynamic movie routes
  allMovies.forEach((movie: any) => {
    xml += `  <url>\n`;
    xml += `    <loc>${siteUrl}/phim/${movie.slug}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
