import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get('code') || 'mock_code_' + Math.floor(Math.random() * 100000);
  const state = url.searchParams.get('state') || 'google';
  
  const provider = state.toLowerCase();
  
  // Extract profile overrides from query parameters if provided
  const paramId = url.searchParams.get('id');
  const paramName = url.searchParams.get('name') || url.searchParams.get('username') || url.searchParams.get('display_name');
  const paramEmail = url.searchParams.get('email');
  const paramAvatar = url.searchParams.get('avatar') || url.searchParams.get('picture');

  let id = paramId || 'oauth_' + Math.floor(Math.random() * 1000000000);
  let name = '';
  let email = '';
  let avatar = '';

  const providerNames: Record<string, string> = {
    google: 'Google',
    facebook: 'Facebook',
    apple: 'Apple',
    zalo: 'Zalo',
    discord: 'Discord',
    github: 'GitHub',
    x: 'X (Twitter)'
  };

  const displayName = providerNames[provider] || 'OAuth Provider';

  switch (provider) {
    case 'google':
      name = paramName || 'Nguyễn Văn Google';
      email = paramEmail || 'user.google@gmail.com';
      avatar = paramAvatar || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
      break;
    case 'facebook':
      name = paramName || 'Trần Thị Facebook';
      email = paramEmail || 'user.facebook@fb.com';
      avatar = paramAvatar || 'https://graph.facebook.com/100000000/picture?type=normal';
      break;
    case 'apple':
      name = paramName || 'Lê Văn Apple';
      email = paramEmail || 'user.apple@icloud.com';
      avatar = paramAvatar || '';
      break;
    case 'zalo':
      name = paramName || 'Phạm Minh Zalo';
      email = paramEmail || '';
      avatar = paramAvatar || 'https://s120-ava-talk.zadn.vn/default.jpg';
      break;
    case 'discord':
      name = paramName || 'Hoàng Discord';
      email = paramEmail || 'user.discord@discordapp.com';
      avatar = paramAvatar || 'https://cdn.discordapp.com/embed/avatars/1.png';
      break;
    case 'github':
      name = paramName || 'Vũ GitHub';
      email = paramEmail || 'user.github@github.com';
      avatar = paramAvatar || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
      break;
    case 'x':
      name = paramName || 'Đặng X Twitter';
      email = paramEmail || '';
      avatar = paramAvatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
      break;
    default:
      name = paramName || 'OAuth User';
      email = paramEmail || 'oauth.user@example.com';
      avatar = paramAvatar || '';
  }

  const profile = {
    id,
    name,
    email: email || undefined,
    avatar: avatar || undefined,
    provider: displayName,
    code,
    state
  };

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Đăng nhập thành công</title>
      <style>
        body {
          background-color: #09090b;
          color: #f4f4f5;
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          padding: 2rem;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1.5rem;
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(10px);
          max-width: 400px;
        }
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: #8b5cf6;
          animation: spin 1s linear infinite;
          margin: 0 auto 1.5rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 { margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 600; }
        p { margin: 0; font-size: 0.875rem; color: #a1a1aa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h2>Đăng nhập thành công</h2>
        <p>Đang đồng bộ hóa tài khoản của bạn...</p>
      </div>

      <script>
        const profile = ${JSON.stringify(profile)};
        
        // Notify the parent opener window
        if (window.opener) {
          window.opener.postMessage({
            type: 'txa-oauth-callback-response',
            success: true,
            profile: profile
          }, '*');
          
          // Close the window after sending message
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          // If no opener, redirect back to homepage
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
};

// Also support POST for Apple form_post redirect flow
export const POST = GET;
