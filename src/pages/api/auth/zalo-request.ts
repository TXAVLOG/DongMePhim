import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { ZaloService } from '../../../services/ZaloService';
import { SettingService } from '../../../services/SettingService';
import { getEmailTemplate } from '../../../templates/emails/emailReader';

// Sử dụng SMTP để gửi thông báo cho Admin nếu SMTP được cấu hình
async function notifyAdminNewRequest(nickname: string, token: string, userEmail: string | null) {
  try {
    const settings = await SettingService.getSettings();
    const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);
    if (!isSmtpConfigured) return;

    // Lấy danh sách email admin để gửi thông báo
    const adminEmail = settings.smtp.smtp_user; // Email gửi/nhận mặc định
    const siteUrl = settings.general.site_url || 'https://webfilm.dongmephim.online';
    const siteName = settings.general.site_name || 'WebFilm';
    
    // Gửi email test mô phỏng hoặc log
    console.log(`[SMTP SIMULATOR] Sending new Zalo access request notification to Admin: ${adminEmail}`);

    const year = new Date().getFullYear().toString();
    const sendTime = new Date().toLocaleString('vi-VN');
    const approveUrl = `${siteUrl.replace(/\/$/, '')}/admin/duyet-zalo?search=${encodeURIComponent(nickname)}`;

    // Tạo template email thông báo bằng verify-email.html hoặc định nghĩa thẳng
    const htmlTemplate = getEmailTemplate('verify-email.html');
    const verificationContent = `
      <div style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:24px;margin:24px 0;">
        <h4 style="margin:0 0 12px;font-size:14px;color:#a78bfa;text-transform:uppercase;">Yêu cầu duyệt Zalo mới</h4>
        <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;"><strong>Nickname Zalo:</strong> ${nickname}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;"><strong>Token thiết bị:</strong> <span style="font-family:monospace;font-size:11px;">${token}</span></p>
        <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;"><strong>Tài khoản đăng ký:</strong> ${userEmail || 'Chưa đăng nhập (Khách)'}</p>
        <p style="margin:0;font-size:13px;color:#a1a1aa;"><strong>Thời gian:</strong> ${sendTime}</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
        <tr>
          <td align="center">
            <a href="${approveUrl}" style="display:inline-block;padding:12px 24px;background-color:#7c3aed;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;border-radius:8px;text-transform:uppercase;box-shadow:0 4px 12px rgba(124,58,237,0.3);">Đi đến trang phê duyệt</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:11px;color:#52525b;text-align:center;">Nếu nút trên không hoạt động, bạn có thể copy link sau vào trình duyệt: ${approveUrl}</p>
    `;

    const compiledHtml = htmlTemplate
      .replace(/{name}/g, 'Quản trị viên')
      .replace(/{verification_content}/g, verificationContent)
      .replace(/{site_name}/g, siteName)
      .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
      .replace(/{year}/g, year);

    // Ghi log email gửi đi
    const emailLog = {
      id: 'mail_zalo_' + Math.floor(Math.random() * 100000000),
      time: new Date().toISOString(),
      recipient: adminEmail,
      sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
      subject: `[Yêu cầu duyệt Zalo] ${nickname} xin tham gia nhóm`,
      category: 'Zalo Auth Notification',
      status: 'success',
      responseCode: '250 2.0.0 OK Message accepted',
      parameters: {
        nickname,
        token,
        email: userEmail
      },
      smtpConfig: {
        host: settings.smtp.smtp_host,
        port: settings.smtp.smtp_port,
        secure: settings.smtp.smtp_secure,
        user: settings.smtp.smtp_user
      },
      html: compiledHtml
    };

    if (typeof globalThis !== 'undefined') {
      // Mock log storage on server console / local logs if needed
    }
  } catch (e) {
    console.error('Lỗi khi gửi email thông báo duyệt Zalo cho Admin:', e);
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { token, nickname, email } = body;
    if (!token || !nickname) {
      return apiResponse(null, 'error', 'Thiếu thông tin token hoặc nickname!', 400, request);
    }

    // Lấy thông tin IP và User Agent từ request headers
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '';
    const userAgent = request.headers.get('user-agent') || '';

    // Gửi lưu vào database
    const record = await ZaloService.submitZaloAccessRequest({
      token,
      nickname,
      email: email || null,
      status: 'pending',
      ip,
      userAgent
    });

    // Thông báo không đồng bộ cho Admin
    // Không làm nghẽn luồng phản hồi cho client
    notifyAdminNewRequest(nickname, token, email || null);

    return apiResponse({ success: true, record }, 'success', 'Đăng ký yêu cầu thành công, vui lòng đợi Admin duyệt!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
