import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

// Simple HMAC-SHA256 signature generator using Web Crypto API
async function generateHmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { price, cycle, username } = await request.json() as any;

    if (!price || !cycle || !username) {
      return apiResponse(null, 'error', 'Thiếu thông tin thanh toán.', 400, request);
    }

    // Retrieve PayOS settings from environment or settings
    const clientId = (import.meta.env.PAYOS_CLIENT_ID || 'mock_payos_id') as string;
    const apiKey = (import.meta.env.PAYOS_API_KEY || 'mock_api_key') as string;
    const checksumKey = (import.meta.env.PAYOS_CHECKSUM_KEY || 'mock_checksum_key') as string;
    const siteUrl = (import.meta.env.SITE_URL || 'http://localhost:4321') as string;

    const orderCode = Number(Date.now().toString().substring(4, 13)); // Generate random order number
    const description = `VIP ${cycle === 'annual' ? 'N' : 'T'} ${username.substring(0, 10)}`;
    const cancelUrl = `${siteUrl}/checkout/failed?method=payos&user=${username}`;
    const returnUrl = `${siteUrl}/checkout/success?method=payos&cycle=${cycle}&price=${price}&user=${username}&orderCode=${orderCode}`;

    // Sort fields alphabetically for PayOS data signature
    const dataToSign = `amount=${price}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
    
    // Generate signature
    const signature = await generateHmacSha256(checksumKey, dataToSign);

    const payosBody = {
      orderCode,
      amount: price,
      description,
      buyerName: username,
      cancelUrl,
      returnUrl,
      signature
    };

    // Send payload to PayOS API
    const res = await fetch('https://api.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payosBody)
    });

    const responseData = await res.json() as any;

    if (!res.ok || responseData.code !== '00') {
      return apiResponse(null, 'error', responseData.desc || 'Lỗi khởi tạo link thanh toán PayOS.', 500, request);
    }

    return apiResponse({ checkoutUrl: responseData.data.checkoutUrl }, 'success', '', 200, request);

  } catch (e: any) {
    return apiResponse(null, 'error', e.message || 'Lỗi máy chủ.', 500, request);
  }
};
