import { defineMiddleware } from 'astro:middleware';
import { verifySession } from '@lib/auth';
import { RateLimiter } from './backend/lib/RateLimiter';
import { SettingService } from './backend/services/SettingService';

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  const host = context.url.hostname || '';
  const isApiSubdomain = host.startsWith('api.');

  // Rate Limiting Anti-DDoS Protection for /api/ routes
  if (pathname.startsWith('/api/')) {
    const ip = RateLimiter.getClientIp(context.request);
    let routeType: 'payment' | 'auth' | 'general' = 'general';
    if (pathname.startsWith('/api/payment/')) {
      routeType = 'payment';
    } else if (pathname.startsWith('/api/auth/')) {
      routeType = 'auth';
    }

    const { allowed, limit, remaining, retryAfterSeconds } = RateLimiter.check(ip, routeType);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Bạn đã truy cập quá nhanh! Vui lòng thử lại sau giây lát.',
          code: 429
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining)
          }
        }
      );
    }
  }

  if (isApiSubdomain && pathname === '/') {
    return new Response(
      JSON.stringify({ status: 'ok', message: 'DongMePhim API Server' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
        }
      }
    );
  }

  // Check Maintenance Mode
  const settings = await SettingService.getSettings();
  const isMaintenance = settings.general.maintenance_enable;

  if (isMaintenance) {
    const currentUser = await verifySession(context.request, context.cookies) as any;
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.roles === 'admin');

    // Admin can bypass maintenance mode
    if (!isAdmin) {
      // Bypass if accessing the maintenance path itself to avoid infinite redirect
      if (pathname === '/maintenance') {
        return next();
      }

      // Redirect others to maintenance page (or a simple response)
      if (pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({
            status: 'error',
            message: settings.general.maintenance_message || 'Hệ thống đang bảo trì, vui lòng quay lại sau!',
            code: 503
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return context.redirect('/maintenance');
    }
  }

  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && pathname !== '/api/admin/movie-action' && pathname !== '/admin/phim/edit' && pathname !== '/api/admin/deimpersonate') {
    const currentUser = await verifySession(context.request, context.cookies) as any;
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.roles === 'admin' || !!currentUser.adminId);

    if (!isAdmin) {
      if (pathname === '/api/admin/members' && context.request.method === 'POST') {
        try {
          const body = await context.request.clone().json() as any;
          const loggedInUser = currentUser ? currentUser.username : null;
          if (body.action === 'edit' && body.username && loggedInUser && body.username.toLowerCase() === loggedInUser.toLowerCase()) {
            if (body.role !== 'admin' && body.roles !== 'admin') {
              context.locals.user = currentUser;
              return next();
            }
          }
        } catch (e) { }
      }

      if (pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({
            status: 'error',
            message: 'Bạn không có quyền truy cập API này!',
            code: 403
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
      return context.redirect('/tphim');
    }

    // Pass the user to locals so components/layouts don't have to query the database again
    context.locals.user = currentUser;
  }

  const response = await next();

  if (isApiSubdomain) {
    try {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    } catch (e) {
      const headers = new Headers(response.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }
  }

  return response;
});
