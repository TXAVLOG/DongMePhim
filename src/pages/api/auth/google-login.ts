import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const credential = body?.credential;

    if (!credential) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu credential từ Google' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Google JWT has 3 parts: Header.Payload.Signature
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ success: false, error: 'Định dạng token không đúng' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Decode base64url payload
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    let payloadDecoded = '';
    try {
      // Decode unicode safely
      payloadDecoded = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (e) {
      try {
        payloadDecoded = atob(payloadBase64);
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: 'Không thể giải mã dữ liệu token' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    let user;
    try {
      user = JSON.parse(payloadDecoded);
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Không thể giải mã dữ liệu token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the user information
    return new Response(JSON.stringify({
      success: true,
      user: {
        sub: user.sub,
        email: user.email,
        email_verified: user.email_verified,
        name: user.name,
        picture: user.picture,
        given_name: user.given_name,
        family_name: user.family_name
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Lỗi hệ thống' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
