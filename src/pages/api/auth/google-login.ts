import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const credential = body?.credential;

    if (!credential) {
      return apiResponse(null, 'error', 'Thiếu credential từ Google', 400, request);
    }

    // Google JWT has 3 parts: Header.Payload.Signature
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return apiResponse(null, 'error', 'Định dạng token không đúng', 400, request);
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
        return apiResponse(null, 'error', 'Không thể giải mã dữ liệu token', 400, request);
      }
    }
    
    let user;
    try {
      user = JSON.parse(payloadDecoded);
    } catch (e) {
      return apiResponse(null, 'error', 'Không thể giải mã dữ liệu token', 400, request);
    }

    // Return the user information
    return apiResponse({
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
    }, 'success', '', 200, request);

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
