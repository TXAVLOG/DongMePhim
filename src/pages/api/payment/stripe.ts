import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { price, cycle, username } = await request.json() as any;
    
    if (!price || !cycle || !username) {
      return new Response(JSON.stringify({ error: 'Thiếu thông tin thanh toán.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Retrieve settings (secret key)
    const secretKey = (import.meta.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_secret_key') as string;
    const siteUrl = (import.meta.env.SITE_URL || 'http://localhost:4321') as string;

    // Call Stripe Checkout REST API
    const stripeBody = new URLSearchParams({
      'success_url': `${siteUrl}/checkout/success?method=stripe&cycle=${cycle}&price=${price}&user=${username}&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${siteUrl}/checkout/failed?method=stripe&user=${username}`,
      'mode': 'payment',
      'line_items[0][price_data][currency]': 'vnd',
      'line_items[0][price_data][product_data][name]': `Premium VIP (${cycle === 'annual' ? 'Hàng năm' : 'Hàng tháng'})`,
      'line_items[0][price_data][unit_amount]': String(price),
      'line_items[0][quantity]': '1',
      'metadata[username]': username,
      'metadata[cycle]': cycle,
      'metadata[price]': String(price),
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: stripeBody.toString()
    });

    const session = await res.json() as any;

    if (!res.ok) {
      return new Response(JSON.stringify({ error: session.error?.message || 'Không thể tạo Stripe Checkout Session.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Lỗi máy chủ.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
