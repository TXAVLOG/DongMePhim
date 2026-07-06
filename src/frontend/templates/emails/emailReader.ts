import fs from 'fs';
import path from 'path';

export function getEmailTemplate(filename: string): string {
  try {
    let filePath = path.resolve(process.cwd(), 'src/frontend/templates/emails', filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(process.cwd(), 'src/templates/emails', filename);
    }
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (e) {
    console.warn(`Could not read template file ${filename} from disk, using fallback string.`, e);
  }

  // Fallbacks in case file system reading fails (e.g. in bundled server environments)
  switch (filename) {
    case 'forgot-password.html':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Khôi phục mật khẩu - {site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <img src="{site_url}/favicon.png" alt="Logo" style="width:56px;height:56px;margin-bottom:16px;border-radius:12px;box-shadow:0 0 15px rgba(245,158,11,0.2);" />
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#f59e0b;letter-spacing:-0.5px;text-transform:uppercase;">{site_name}</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào {name},</h3>
              <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Chúng tôi nhận được yêu cầu thiết lập lại mật khẩu cho tài khoản liên kết với email <span style="color:#60a5fa;font-weight:600;">{email}</span> trên hệ thống {site_name}.</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <a href="{reset_link}" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #f59e0b, #d97706);color:#09090b;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(245,158,11,0.3);">Đặt lại mật khẩu</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0 0 16px;font-size:13px;color:#71717a;line-height:1.6;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn và mật khẩu sẽ không thay đổi.</p>
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">Liên kết này sẽ hết hạn trong vòng 1 giờ vì lý do bảo mật.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:30px 40px;background-color:#0c0c0e;border-top:1px solid rgba(255,255,255,0.03);text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#52525b;">Hệ thống gửi thư tự động từ {site_name} - Trải nghiệm điện ảnh đỉnh cao</p>
              <p style="margin:0;font-size:10px;color:#3f3f46;">© {year} {site_name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    case 'smtp-test.html':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kiểm tra cấu hình SMTP - {site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <img src="{site_url}/favicon.png" alt="Logo" style="width:56px;height:56px;margin-bottom:16px;border-radius:12px;box-shadow:0 0 15px rgba(139,92,246,0.2);" />
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#8b5cf6;letter-spacing:-0.5px;text-transform:uppercase;">{site_name} SMTP Test</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào Admin,</h3>
              <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">Đây là email kiểm tra kết nối từ hệ thống cấu hình SMTP của {site_name}.</p>
              
              <div style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:20px;margin:24px 0;">
                <p style="margin:0 0 12px;font-size:13px;color:#ffffff;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#8b5cf6;">Thông số kiểm thử:</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#a1a1aa;line-height:1.8;">
                  <tr>
                    <td width="35%" style="font-weight:600;padding:4px 0;">SMTP Host:</td>
                    <td style="color:#ffffff;padding:4px 0;">{smtp_host}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:600;padding:4px 0;">SMTP Port:</td>
                    <td style="color:#ffffff;padding:4px 0;">{smtp_port}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:600;padding:4px 0;">SMTP Secure:</td>
                    <td style="color:#ffffff;padding:4px 0;">{smtp_secure}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:600;padding:4px 0;">SMTP User:</td>
                    <td style="color:#ffffff;padding:4px 0;">{smtp_user}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:600;padding:4px 0;">Thời gian gửi:</td>
                    <td style="color:#ffffff;padding:4px 0;">{send_time}</td>
                  </tr>
                </table>
              </div>
              
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">Nếu email này gửi đi thành công, điều đó có nghĩa là các chức năng như Đăng ký xác thực email hoặc Khôi phục mật khẩu sẽ hoạt động bình thường trên hệ thống {site_name}.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:30px 40px;background-color:#0c0c0e;border-top:1px solid rgba(255,255,255,0.03);text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#52525b;">Hệ thống gửi thư tự động từ {site_name} - Trải nghiệm điện ảnh đỉnh cao</p>
              <p style="margin:0;font-size:10px;color:#3f3f46;">© {year} {site_name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    case 'verify-email.html':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác minh tài khoản của bạn tại {site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <img src="{site_url}/favicon.png" alt="Logo" style="width:56px;height:56px;margin-bottom:16px;border-radius:12px;box-shadow:0 0 15px rgba(124, 58, 237, 0.2);" />
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#7c3aed;letter-spacing:-0.5px;text-transform:uppercase;">{site_name}</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào {name},</h3>
              {verification_content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:30px 40px;background-color:#0c0c0e;border-top:1px solid rgba(255,255,255,0.03);text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#52525b;">Hệ thống gửi thư tự động từ {site_name} - Trải nghiệm điện ảnh đỉnh cao</p>
              <p style="margin:0;font-size:10px;color:#3f3f46;">© {year} {site_name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    case 'zalo-auto-approved-admin.html':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông báo tự động duyệt Zalo bằng Key Bypass - {site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <img src="{site_url}/favicon.png" alt="Logo" style="width:56px;height:56px;margin-bottom:16px;border-radius:12px;" />
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#10b981;letter-spacing:-0.5px;text-transform:uppercase;">{site_name} Auto-Approve</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào Admin,</h3>
              <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">Hệ thống vừa tự động phê duyệt thành công một yêu cầu truy cập Zalo nhờ Mã Key Bypass hợp lệ.</p>
              <div style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:20px;margin:24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#a1a1aa;line-height:1.8;">
                  <tr><td width="35%">Mã Key DP:</td><td style="color:#10b981;font-weight:bold;font-family:monospace;">{key_code}</td></tr>
                  <tr><td>Nickname Zalo:</td><td style="color:#ffffff;font-weight:bold;">{nickname}</td></tr>
                  <tr><td>Browser Token:</td><td style="color:#ffffff;font-family:monospace;font-size:11px;">{token}</td></tr>
                  <tr><td>Địa chỉ IP:</td><td style="color:#ffffff;">{ip}</td></tr>
                  <tr><td>Thời gian duyệt:</td><td style="color:#ffffff;">{send_time}</td></tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    case 'zalo-key-issued-user.html':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã Key Bypass Duyệt Zalo - {site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <img src="{site_url}/favicon.png" alt="Logo" style="width:56px;height:56px;margin-bottom:16px;border-radius:12px;" />
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#a78bfa;letter-spacing:-0.5px;text-transform:uppercase;">{site_name} VIP Key</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào Quý khách,</h3>
              <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">Cảm ơn bạn đã mua **{package_title}** tại {site_name}. Mã Key Bypass Zalo của bạn (Dùng tối đa 15 thiết bị):</p>
              <div style="background-color:#18181b;border:2px dashed #a78bfa;border-radius:16px;padding:24px;margin:24px 0;text-align:center;">
                <div style="font-size:32px;font-weight:900;color:#a78bfa;font-family:monospace;letter-spacing:3px;">{key_code}</div>
                <p style="margin:8px 0 0;font-size:12px;color:#71717a;">Hạn sử dụng: <strong style="color:#ffffff;">{expiry_date}</strong></p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    case 'content-verify-link.html':
      return `<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Cảm ơn bạn đã đăng ký tài khoản tại {site_name}. Để hoàn tất đăng ký, vui lòng nhấp vào liên kết dưới đây để kích hoạt tài khoản của bạn:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
  <tr>
    <td align="center">
      <a href="{verify_link}" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #7c3aed, #6d28d9);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(124,58,237,0.3);">Xác minh tài khoản</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:11px;color:#52525b;text-align:center;">Nếu nút trên không hoạt động, bạn có thể copy link sau vào trình duyệt: {verify_link}</p>
<p style="margin:12px 0 0;font-size:11px;color:#52525b;text-align:center;">Liên kết này sẽ hết hạn sau {token_expiry} phút.</p>`;

    case 'content-verify-otp.html':
      return `<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Cảm ơn bạn đã đăng ký tài khoản tại {site_name}. Để hoàn tất đăng ký, vui lòng sử dụng mã OTP gồm 6 chữ số dưới đây để xác minh tài khoản của bạn:</p>
<div style="background-color:#18181b;border:2px dashed #7c3aed;border-radius:16px;padding:20px;text-align:center;margin:24px 0;">
  <span style="font-size:32px;font-weight:900;color:#7c3aed;font-family:monospace;letter-spacing:4px;">{otp_code}</span>
  <p style="margin:8px 0 0;font-size:11px;color:#71717a;">Mã OTP này sẽ hết hạn sau {token_expiry} phút.</p>
</div>`;

    case 'content-resend-link.html':
      return `<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Yêu cầu gửi lại liên kết xác minh tài khoản của bạn tại {site_name}. Vui lòng nhấp vào liên kết dưới đây để kích hoạt tài khoản:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
  <tr>
    <td align="center">
      <a href="{verify_link}" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #7c3aed, #6d28d9);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(124,58,237,0.3);">Xác minh tài khoản</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:11px;color:#52525b;text-align:center;">Nếu nút trên không hoạt động, bạn có thể copy link sau vào trình duyệt: {verify_link}</p>
<p style="margin:12px 0 0;font-size:11px;color:#52525b;text-align:center;">Liên kết này sẽ hết hạn sau {token_expiry} phút.</p>`;

    case 'content-resend-otp.html':
      return `<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Yêu cầu gửi lại mã xác minh tài khoản của bạn tại {site_name}. Vui lòng sử dụng mã OTP gồm 6 chữ số dưới đây để kích hoạt tài khoản:</p>
<div style="background-color:#18181b;border:2px dashed #7c3aed;border-radius:16px;padding:20px;text-align:center;margin:24px 0;">
  <span style="font-size:32px;font-weight:900;color:#7c3aed;font-family:monospace;letter-spacing:4px;">{otp_code}</span>
  <p style="margin:8px 0 0;font-size:11px;color:#71717a;">Mã OTP này sẽ hết hạn sau {token_expiry} phút.</p>
</div>`;

    case 'content-expiry-warning.html':
      return `<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Chào <strong>{name}</strong>,</p>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Gói dịch vụ <strong>{package_title}</strong> của bạn tại {site_name} sẽ hết hạn sau 3 ngày nữa, vào ngày <strong>{expiry_date}</strong>.</p>
<div style="background-color:#18181b;border:1px solid #3f3f46;border-radius:16px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 12px;font-size:13px;color:#f43f5e;font-weight:bold;">⚠️ Thông báo gia hạn tự động:</p>
  <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">Nếu bạn đang sử dụng gói gia hạn hàng tháng hoặc hàng năm, vui lòng đảm bảo chuẩn bị đủ số dư trong tài khoản để hệ thống có thể tự động gia hạn dịch vụ cho bạn, tránh gián đoạn trải nghiệm xem phim nhé.</p>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
  <tr>
    <td align="center">
      <a href="{site_url}/nang-cap" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #7c3aed, #6d28d9);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(124,58,237,0.3);">Xem chi tiết gói cước</a>
    </td>
  </tr>
</table>`;

    case 'content-expiry-expired.html':
      return `<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Chào <strong>{name}</strong>,</p>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Gói dịch vụ <strong>{package_title}</strong> của bạn tại {site_name} đã chính thức hết hạn vào ngày <strong>{expiry_date}</strong>.</p>
<div style="background-color:#18181b;border:1px solid #3f3f46;border-radius:16px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 12px;font-size:13px;color:#f43f5e;font-weight:bold;">🔄 Trở về Gói Free:</p>
  <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">Do gói cước đã hết hạn và không được tự động gia hạn thành công, tài khoản của bạn đã được chuyển về trạng thái <strong>Gói Free</strong>. Bạn vẫn có thể tiếp tục xem phim có quảng cáo bình thường.</p>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
  <tr>
    <td align="center">
      <a href="{site_url}/nang-cap" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #7c3aed, #6d28d9);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(124,58,237,0.3);">Gia hạn / Nâng cấp ngay</a>
    </td>
  </tr>
</table>`;

    case 'content-purchase-success.html':
      return `<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Chào <strong>{name}</strong>,</p>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Cảm ơn bạn đã nâng cấp dịch vụ tại {site_name}. Giao dịch của bạn đã được xác nhận thành công!</p>
<div style="background-color:#18181b;border:1px solid #7c3aed;border-radius:16px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px;font-size:13px;color:#ffffff;font-weight:bold;">Thông tin gói dịch vụ:</p>
  <table width="100%" style="font-size:12px;color:#a1a1aa;line-height:1.6;">
    <tr>
      <td width="40%">Tài khoản:</td>
      <td style="color:#ffffff;"><strong>{username}</strong></td>
    </tr>
    <tr>
      <td>Gói đăng ký:</td>
      <td style="color:#7c3aed;"><strong>{package_title}</strong></td>
    </tr>
    <tr>
      <td>Thời hạn đến:</td>
      <td style="color:#ffffff;"><strong>{expiry_date}</strong></td>
    </tr>
  </table>
</div>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Chúc bạn có những giây phút xem phim vui vẻ tại {site_name}!</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
  <tr>
    <td align="center">
      <a href="{site_url}" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #7c3aed, #6d28d9);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(124,58,237,0.3);">Xem phim ngay</a>
    </td>
  </tr>
</table>`;

    case 'content-purchase-admin.html':
      return `<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Chào Admin,</p>
<p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Hệ thống vừa ghi nhận một giao dịch nâng cấp gói cước thành công mới.</p>
<div style="background-color:#18181b;border:1px solid #3f3f46;border-radius:16px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px;font-size:13px;color:#ffffff;font-weight:bold;">Thông tin chi tiết:</p>
  <table width="100%" style="font-size:12px;color:#a1a1aa;line-height:1.6;">
    <tr>
      <td width="40%">Tài khoản:</td>
      <td style="color:#ffffff;"><strong>{username}</strong></td>
    </tr>
    <tr>
      <td>Email khách hàng:</td>
      <td style="color:#ffffff;">{email}</td>
    </tr>
    <tr>
      <td>Gói đăng ký:</td>
      <td style="color:#a78bfa;"><strong>{package_title}</strong></td>
    </tr>
    <tr>
      <td>Thời hạn đến:</td>
      <td style="color:#ffffff;">{expiry_date}</td>
    </tr>
  </table>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
  <tr>
    <td align="center">
      <a href="{site_url}/admin/thanh-vien/goi-dang-ky" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #7c3aed, #6d28d9);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(124,58,237,0.3);">Quản lý thành viên</a>
    </td>
  </tr>
</table>`;

    case 'movie-episode-update.html':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tập mới phim {movie_title} - {site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <img src="{site_url}/favicon.png" alt="Logo" style="width:56px;height:56px;margin-bottom:16px;border-radius:12px;box-shadow:0 0 15px rgba(124, 58, 237, 0.2);" />
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#7c3aed;letter-spacing:-0.5px;text-transform:uppercase;">{site_name}</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào {name},</h3>
              <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">Phim <strong style="color:#ffffff;">{movie_title}</strong> trong danh sách yêu thích của bạn vừa cập nhật tập mới:</p>
              
              <div style="background-color:#18181b;border:1px solid #7c3aed;border-radius:16px;padding:20px;margin:24px 0;text-align:center;">
                <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;">Tập hiện tại:</p>
                <div style="font-size:28px;font-weight:900;color:#7c3aed;font-family:monospace;letter-spacing:1px;">{episode_current}</div>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <a href="{movie_link}" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #7c3aed, #6d28d9);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(124,58,237,0.3);">Xem phim ngay</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:30px 40px;background-color:#0c0c0e;border-top:1px solid rgba(255,255,255,0.03);text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#52525b;">Hệ thống gửi thư tự động từ {site_name} - Trải nghiệm điện ảnh đỉnh cao</p>
              <p style="margin:0;font-size:10px;color:#3f3f46;">© {year} {site_name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    case 'movie-request-admin.html':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yêu cầu phim mới - {site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <img src="{site_url}/favicon.png" alt="Logo" style="width:56px;height:56px;margin-bottom:16px;border-radius:12px;box-shadow:0 0 15px rgba(124, 58, 237, 0.2);" />
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#7c3aed;letter-spacing:-0.5px;text-transform:uppercase;">{site_name} Yêu Cầu Phim</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào Admin,</h3>
              <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">Hệ thống vừa nhận được một yêu cầu phim mới từ thành viên <strong style="color:#ffffff;">{username}</strong>.</p>
              <div style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:20px;margin:24px 0;">
                <p style="margin:0 0 12px;font-size:13px;color:#7c3aed;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Thông tin yêu cầu:</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#a1a1aa;line-height:1.8;">
                  <tr><td width="35%" style="font-weight:600;padding:4px 0;">Tên phim:</td><td style="color:#ffffff;font-weight:bold;padding:4px 0;">{movie_name}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 0;">Tên gốc:</td><td style="color:#ffffff;padding:4px 0;">{origin_name}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 0;">Năm sản xuất:</td><td style="color:#ffffff;padding:4px 0;">{publish_year}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 0;">Tác giả/Đạo diễn:</td><td style="color:#ffffff;padding:4px 0;">{author}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 0;">Link phim (nếu có):</td><td style="color:#60a5fa;padding:4px 0;word-break:break-all;"><a href="{movie_link}" style="color:#60a5fa;text-decoration:none;">{movie_link}</a></td></tr>
                  <tr><td style="font-weight:600;padding:4px 0;">Thời gian gửi:</td><td style="color:#ffffff;padding:4px 0;">{send_time}</td></tr>
                </table>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr><td align="center"><a href="{site_url}/admin/yeu-cau-phim" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #7c3aed, #6d28d9);color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(124,58,237,0.3);">Xem danh sách yêu cầu</a></td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px;background-color:#0c0c0e;border-top:1px solid rgba(255,255,255,0.03);text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#52525b;">Hệ thống gửi thư tự động từ {site_name}</p>
              <p style="margin:0;font-size:10px;color:#3f3f46;">© {year} {site_name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    case 'movie-request-approved.html':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yêu cầu phim của bạn đã được duyệt! - {site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <img src="{site_url}/favicon.png" alt="Logo" style="width:56px;height:56px;margin-bottom:16px;border-radius:12px;box-shadow:0 0 15px rgba(16, 185, 129, 0.2);" />
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#10b981;letter-spacing:-0.5px;text-transform:uppercase;">{site_name} Yêu Cầu Phim</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào {name},</h3>
              <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">Chúng tôi vui mừng thông báo rằng yêu cầu phim của bạn đã được phê duyệt thành công!</p>
              <div style="background-color:#18181b;border:1px solid #10b981;border-radius:16px;padding:20px;margin:24px 0;">
                <p style="margin:0;font-size:14px;color:#ffffff;line-height:1.6;">Bộ phim: <strong style="color:#10b981;">{movie_name}</strong> đã được cập nhật lên hệ thống.</p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr><td align="center"><a href="{site_url}" style="display:inline-block;padding:14px 30px;background:linear-gradient(to right, #10b981, #059669);color:#09090b;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:12px;box-shadow:0 4px 15px rgba(16,185,129,0.3);">Xem phim ngay</a></td></tr>
              </table>
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">Chúc bạn có những giây phút trải nghiệm điện ảnh thú vị tại {site_name}!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px;background-color:#0c0c0e;border-top:1px solid rgba(255,255,255,0.03);text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#52525b;">Hệ thống gửi thư tự động từ {site_name}</p>
              <p style="margin:0;font-size:10px;color:#3f3f46;">© {year} {site_name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    case 'movie-request-rejected.html':
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông báo về yêu cầu phim của bạn - {site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <img src="{site_url}/favicon.png" alt="Logo" style="width:56px;height:56px;margin-bottom:16px;border-radius:12px;box-shadow:0 0 15px rgba(239, 68, 68, 0.2);" />
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#ef4444;letter-spacing:-0.5px;text-transform:uppercase;">{site_name} Yêu Cầu Phim</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào {name},</h3>
              <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">Yêu cầu phim <strong style="color:#ffffff;">{movie_name}</strong> của bạn đã bị từ chối.</p>
              <div style="background-color:#18181b;border:1px solid #ef4444;border-radius:16px;padding:20px;margin:24px 0;">
                <p style="margin:0 0 8px;font-size:13px;color:#ef4444;font-weight:bold;text-transform:uppercase;">Lý do từ chối:</p>
                <p style="margin:0;font-size:14px;color:#ffffff;line-height:1.6;">{reject_reason}</p>
              </div>
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">Nếu bạn muốn gửi lại yêu cầu với thông tin chính xác hơn, vui lòng thực hiện lại trong ứng dụng.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px;background-color:#0c0c0e;border-top:1px solid rgba(255,255,255,0.03);text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#52525b;">Hệ thống gửi thư tự động từ {site_name}</p>
              <p style="margin:0;font-size:10px;color:#3f3f46;">© {year} {site_name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    default:
      return '';
  }
}
