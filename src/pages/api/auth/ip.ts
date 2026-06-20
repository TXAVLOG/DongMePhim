import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, clientAddress }) => {
  try {
    const cfIp = request.headers.get('cf-connecting-ip');
    const cfCountry = request.headers.get('cf-ipcountry') || '';
    const cfCity = request.headers.get('cf-ipcity') || '';
    const cfRegion = request.headers.get('cf-region') || '';
    
    // Fallback: cf-connecting-ip -> x-real-ip -> x-forwarded-for -> clientAddress
    const ip = cfIp || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || '127.0.0.1';
    
    return new Response(JSON.stringify({
      ip,
      city: cfCity,
      region: cfRegion,
      country: cfCountry
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, must-revalidate'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
