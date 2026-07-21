import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
import { getEmailTemplate } from '@templates/emails/emailReader';
import { SmtpClient } from '@lib/api/smtpClient';
import { verifySession } from '@lib/auth';
import { encryptPassword, decryptPassword, isEncrypted } from '@lib/passwordCrypto';

// GET: Lấy danh sách thành viên từ Supabase
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const currentUser = await verifySession(request, cookies);
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.roles === 'admin');

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const settings = await SettingService.getSettings();
    const secretKey = settings.encryption?.secret_key || '';

    // Ánh xạ các trường từ database sang định dạng frontend mong muốn
    const mappedUsers = [];
    for (const u of users) {
      let displayPass = u.password;
      if (isAdmin && isEncrypted(u.password) && secretKey) {
        const decrypted = await decryptPassword(u.password, secretKey);
        if (decrypted !== null) displayPass = decrypted;
      }

      mappedUsers.push({
        id: u.id,
        username: u.username,
        email: u.email,
        password: displayPass,
        name: u.name || 'Người dùng',
        role: u.role || 'user',
        roles: u.role === 'user' ? 'users' : (u.role || 'users'), // Hỗ trợ cả 2 định dạng
        avatar: u.avatar_url || '',
        gender: u.gender || '',
        province: u.province || '',
        ward: u.ward || '',
        createdAt: u.created_at,
        status: u.status || 'active',
        package: u.package || 'free',
        emailVerified: u.email_verified !== false,
        expiryDate: u.expiry_date || '',
        joinDate: u.join_date || ''
      });
    }

    return apiResponse(mappedUsers, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Thêm, sửa, xóa, hoặc thao tác hàng loạt trên thành viên
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { action, username, email, password, role, roles, package: userPackage, status, emailVerified, oldUsername, expiryDate, joinDate } = body;
    if (!action) {
      return apiResponse(null, 'error', 'Thiếu hành động (action)!', 400, request);
    }

    // 1. Thêm thành viên mới
    if (action === 'add') {
      if (!username || !email) {
        return apiResponse(null, 'error', 'Vui lòng điền đầy đủ các trường bắt buộc!', 400, request);
      }

      // Check trùng
      const { data: existingUser } = await supabase
        .from('users')
        .select('username, email')
        .or(`username.eq.${username},email.eq.${email}`)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.username?.toLowerCase() === username.toLowerCase()) {
          return apiResponse(null, 'error', 'Tên tài khoản đã tồn tại!', 400, request);
        }
        return apiResponse(null, 'error', 'Địa chỉ email đã được đăng ký!', 400, request);
      }

      const settings = await SettingService.getSettings();
      const secretKey = settings.encryption?.secret_key || '';
      const plainPassword = password || '123456';
      const securePassword = secretKey ? await encryptPassword(plainPassword, secretKey) : plainPassword;

      const emailHash = Math.random().toString(36).substring(2, 10); // Simple fallback/mock gravatar hash
      const { error } = await supabase
        .from('users')
        .insert({
          username,
          email,
          password: securePassword,
          role: (role === 'users' || roles === 'users') ? 'user' : (role || roles || 'user'),
          name: username,
          avatar_url: `https://www.gravatar.com/avatar/${emailHash}?d=identicon`,
          package: userPackage || 'free',
          status: status || 'active',
          email_verified: emailVerified !== false,
          expiry_date: expiryDate || null,
          join_date: joinDate || new Date().toISOString()
        });

      if (error) throw error;
      return apiResponse({ success: true }, 'success', 'Thêm thành viên thành công!', 200, request);
    }

    // 2. Cập nhật thành viên
    if (action === 'edit') {
      const targetUsername = oldUsername || username;
      if (!targetUsername) {
        return apiResponse(null, 'error', 'Thiếu thông tin người dùng mục tiêu!', 400, request);
      }

      // Fetch old package and email
      const { data: oldUser } = await supabase
        .from('users')
        .select('package, email, username')
        .eq('username', targetUsername)
        .maybeSingle();

      const oldPkg = oldUser?.package || 'free';

      const updates: any = {};
      if (email !== undefined) updates.email = email;
      if (password !== undefined) {
        const settings = await SettingService.getSettings();
        const secretKey = settings.encryption?.secret_key || '';
        updates.password = secretKey ? await encryptPassword(password, secretKey) : password;
      }
      if (role !== undefined || roles !== undefined) {
        const finalRole = role || roles;
        updates.role = finalRole === 'users' ? 'user' : finalRole;
      }
      if (userPackage !== undefined) updates.package = userPackage;
      if (status !== undefined) updates.status = status;
      if (emailVerified !== undefined) updates.email_verified = emailVerified;
      if (expiryDate !== undefined) updates.expiry_date = expiryDate || null;
      if (joinDate !== undefined) updates.join_date = joinDate || null;

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('username', targetUsername);

      if (error) throw error;

      const newPkg = updates.package || oldPkg;
      const finalEmail = updates.email || oldUser?.email || '';

      if (newPkg !== oldPkg && newPkg.toLowerCase() !== 'free' && finalEmail) {
        let settings: any = null;
        let siteName = 'DongMePhim';
        let resolvedPkg: any = null;
        let userHtml = '';
        try {
          settings = await SettingService.getSettings();
          const siteUrl = settings.general?.site_url || 'https://dongmephim.online';
          siteName = settings.general?.site_name || 'DongMePhim';
          const year = new Date().getFullYear().toString();
          
          const expDateVal = updates.expiry_date || null;
          const formattedExpiry = expDateVal 
            ? new Date(expDateVal).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
            : 'Vô thời hạn';

          const packagesList = settings.packages || [];
          resolvedPkg = packagesList.find((p: any) => 
            (p.id || '').toLowerCase() === newPkg.toLowerCase() || 
            (p.title || '').toLowerCase() === newPkg.toLowerCase()
          );

          // 1. Send success email to user
          const successTemplate = getEmailTemplate('content-purchase-success.html');
          const userEmailContent = successTemplate
            .replace(/{name}/g, targetUsername)
            .replace(/{username}/g, targetUsername)
            .replace(/{package_title}/g, resolvedPkg?.title || newPkg)
            .replace(/{expiry_date}/g, formattedExpiry)
            .replace(/{site_name}/g, siteName)
            .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''));
            
          userHtml = getEmailTemplate('verify-email.html')
            .replace(/{name}/g, targetUsername)
            .replace(/{verification_content}/g, userEmailContent)
            .replace(/{site_name}/g, siteName)
            .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
            .replace(/{year}/g, year);

          const userMailResult = await SmtpClient.sendMail({
            host: settings.smtp.smtp_host,
            port: settings.smtp.smtp_port,
            secure: settings.smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
            user: settings.smtp.smtp_user,
            pass: settings.smtp.smtp_pass,
            fromEmail: settings.smtp.smtp_user,
            fromName: siteName
          }, {
            to: finalEmail,
            subject: `[${siteName}] Kích hoạt thành công gói cước ${resolvedPkg?.title || newPkg}`,
            html: userHtml
          });

          // 2. Send email to admin
          let adminMailResult = null;
          const adminEmail = settings.smtp.smtp_user;
          let adminHtml = '';
          if (adminEmail) {
            const adminTemplate = getEmailTemplate('content-purchase-admin.html');
            const adminEmailContent = adminTemplate
              .replace(/{username}/g, targetUsername)
              .replace(/{email}/g, finalEmail)
              .replace(/{package_title}/g, resolvedPkg?.title || newPkg)
              .replace(/{expiry_date}/g, formattedExpiry)
              .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''));
              
            adminHtml = getEmailTemplate('verify-email.html')
              .replace(/{name}/g, 'Admin')
              .replace(/{verification_content}/g, adminEmailContent)
              .replace(/{site_name}/g, siteName)
              .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
              .replace(/{year}/g, year);

            adminMailResult = await SmtpClient.sendMail({
              host: settings.smtp.smtp_host,
              port: settings.smtp.smtp_port,
              secure: settings.smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
              user: settings.smtp.smtp_user,
              pass: settings.smtp.smtp_pass,
              fromEmail: settings.smtp.smtp_user,
              fromName: siteName
            }, {
              to: adminEmail,
              subject: `[${siteName}] Thông báo: Có thành viên mới mua gói cước`,
              html: adminHtml
            });
          }

          // Log emails in txa_email_logs
          const smtpConfig = {
            host: settings.smtp.smtp_host,
            port: settings.smtp.smtp_port,
            secure: settings.smtp.smtp_secure,
            user: settings.smtp.smtp_user
          };

          const logsToInsert = [
            {
              recipient: finalEmail,
              sender: settings.smtp.smtp_user,
              subject: `[${siteName}] Kích hoạt thành công gói cước ${resolvedPkg?.title || newPkg}`,
              category: 'purchase-success',
              status: 'success',
              response_code: userMailResult.responseCode || '250 OK',
              smtp_config: smtpConfig,
              html: userHtml
            }
          ];

          if (adminEmail) {
            logsToInsert.push({
              recipient: adminEmail,
              sender: settings.smtp.smtp_user,
              subject: `[${siteName}] Thông báo: Có thành viên mới mua gói cước`,
              category: 'purchase-admin-notification',
              status: 'success',
              response_code: adminMailResult?.responseCode || '250 OK',
              smtp_config: smtpConfig,
              html: adminHtml
            });
          }

          await supabase.from('txa_email_logs').insert(logsToInsert);
        } catch (emailErr: any) {
          console.error('Error sending member edit purchase notification emails:', emailErr);
          try {
            const smtpConfig = {
              host: settings.smtp.smtp_host,
              port: settings.smtp.smtp_port,
              secure: settings.smtp.smtp_secure,
              user: settings.smtp.smtp_user
            };
            await supabase.from('txa_email_logs').insert({
              recipient: finalEmail,
              sender: settings.smtp.smtp_user,
              subject: `[${siteName}] Kích hoạt thành công gói cước ${resolvedPkg?.title || newPkg}`,
              category: 'purchase-success',
              status: 'failed',
              response_code: emailErr.message || 'SMTP Error',
              smtp_config: smtpConfig,
              html: userHtml
            });
          } catch (logErr) {}
        }
      }

      return apiResponse({ success: true }, 'success', 'Cập nhật thành viên thành công!', 200, request);
    }

    // 3. Xóa thành viên
    if (action === 'delete') {
      if (!username) {
        return apiResponse(null, 'error', 'Thiếu tên tài khoản cần xóa!', 400, request);
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', username);

      if (error) throw error;
      return apiResponse({ success: true }, 'success', 'Xóa thành viên thành công!', 200, request);
    }

    // 4. Thao tác hàng loạt
    if (action === 'bulk') {
      const { usernames, bulkAction } = body;
      if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
        return apiResponse(null, 'error', 'Thiếu danh sách người dùng!', 400, request);
      }

      if (!bulkAction) {
        return apiResponse(null, 'error', 'Thiếu hành động hàng loạt!', 400, request);
      }

      if (bulkAction === 'delete') {
        const { error } = await supabase
          .from('users')
          .delete()
          .in('username', usernames);

        if (error) throw error;
      } else {
        const updates: any = {};
        if (bulkAction.startsWith('status-')) {
          updates.status = bulkAction.substring(7);
        } else if (bulkAction.startsWith('package-')) {
          const nextPkg = bulkAction.substring(8);
          updates.package = nextPkg;
          if (nextPkg.includes('VIP')) {
            updates.join_date = new Date().toISOString();
            const days = nextPkg.includes('Year') || nextPkg.includes('Năm') || nextPkg.includes('12') ? 365 : 30;
            updates.expiry_date = new Date(Date.now() + 3600 * 1000 * 24 * days).toISOString();
          } else {
            updates.expiry_date = null;
          }
        } else if (bulkAction.startsWith('role-')) {
          const bulkRole = bulkAction.substring(5);
          updates.role = bulkRole === 'users' ? 'user' : bulkRole;
        } else if (bulkAction.startsWith('verified-')) {
          updates.email_verified = (bulkAction.substring(9) === 'true');
        } else {
          return apiResponse(null, 'error', 'Hành động hàng loạt không hợp lệ!', 400, request);
        }

        const { error } = await supabase
          .from('users')
          .update(updates)
          .in('username', usernames);

        if (error) throw error;
      }

      return apiResponse({ success: true }, 'success', 'Áp dụng hành động hàng loạt thành công!', 200, request);
    }

    // 5. Reset mật khẩu thành viên & gửi email SMTP
    if (action === 'reset_password') {
      const targetUsername = username || body.targetUsername || body.email;
      if (!targetUsername) {
        return apiResponse(null, 'error', 'Thiếu tên tài khoản hoặc email cần reset mật khẩu!', 400, request);
      }

      // Lấy thông tin Admin đang thao tác
      const currentUser = await verifySession(request, cookies);
      const adminName = currentUser?.name || currentUser?.username || 'Admin';

      // Tìm user theo username hoặc email
      const { data: targetUser, error: userErr } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${targetUsername},email.eq.${targetUsername}`)
        .maybeSingle();

      if (userErr || !targetUser) {
        return apiResponse(null, 'error', 'Không tìm thấy người dùng mục tiêu!', 404, request);
      }

      const settings = await SettingService.getSettings();
      const secretKey = settings.encryption?.secret_key || '';
      
      let newPassword = body.customPassword;
      if (!newPassword || !validateStrongPassword(newPassword)) {
        newPassword = generateStrongPassword(12);
      }

      const securePassword = secretKey ? await encryptPassword(newPassword, secretKey) : newPassword;

      const { error: updateErr } = await supabase
        .from('users')
        .update({ password: securePassword, updated_at: new Date().toISOString() })
        .eq('id', targetUser.id);

      if (updateErr) throw updateErr;

      // Thử gửi Email qua SMTP nếu được cấu hình
      let emailSent = false;
      let emailMsg = '';
      const smtp = settings.smtp || {};
      const isSmtpEnabled = !!(smtp.smtp_host && smtp.smtp_user && smtp.smtp_pass);

      const targetEmail = targetUser.email || '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmailValid = emailRegex.test(targetEmail);

      const siteUrl = (settings.general?.site_url || 'https://dongmephim.online').replace(/\/$/, '');
      const siteName = settings.general?.site_name || 'DongMePhim';
      const year = new Date().getFullYear().toString();
      const resetTime = body.clientTime || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

      let compiledHtml = '';
      const rawTemplate = getEmailTemplate('reset-password-admin.html') || getEmailTemplate('verify-email.html');

      if (rawTemplate.includes('{new_password}')) {
        compiledHtml = rawTemplate
          .replace(/{name}/g, targetUser.name || targetUser.username)
          .replace(/{username}/g, targetUser.username)
          .replace(/{email}/g, targetEmail || 'Chưa cập nhật')
          .replace(/{new_password}/g, newPassword)
          .replace(/{reset_time}/g, resetTime)
          .replace(/{admin_name}/g, adminName)
          .replace(/{site_name}/g, siteName)
          .replace(/{site_url}/g, siteUrl)
          .replace(/{year}/g, year);
      } else {
        const resetEmailContent = `<p>Chào <strong>${targetUser.name || targetUser.username}</strong>,</p>
          <p>Mật khẩu tài khoản của bạn tại <strong>${siteName}</strong> vừa được đặt lại bởi Admin <strong>${adminName}</strong> vào lúc <strong>${resetTime}</strong>.</p>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 16px; border-radius: 12px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Tên tài khoản:</strong> <code>${targetUser.username}</code></p>
            <p style="margin: 0;"><strong>Mật khẩu mới:</strong> <code style="color: #3b82f6; font-size: 16px; font-weight: bold;">${newPassword}</code></p>
          </div>
          <p>Vui lòng đăng nhập và đổi lại mật khẩu mới để bảo mật tài khoản.</p>`;

        compiledHtml = rawTemplate
          .replace(/{name}/g, targetUser.name || targetUser.username)
          .replace(/{verification_content}/g, resetEmailContent)
          .replace(/{site_name}/g, siteName)
          .replace(/{site_url}/g, siteUrl)
          .replace(/{year}/g, year);
      }

      const smtpConfigForLog = {
        host: smtp.smtp_host,
        port: smtp.smtp_port,
        secure: smtp.smtp_secure,
        user: smtp.smtp_user
      };

      if (isSmtpEnabled) {
        if (!isEmailValid) {
          emailMsg = `Địa chỉ email thành viên (${targetEmail || 'trống'}) không hợp lệ!`;
          // Lưu log lỗi email không hợp lệ
          try {
            await supabase.from('txa_email_logs').insert({
              recipient: targetEmail || targetUser.username,
              sender: `${smtp.smtp_from_name || siteName} <${smtp.smtp_from_email || smtp.smtp_user}>`,
              subject: `[${siteName}] Đặt lại mật khẩu tài khoản thành công`,
              category: 'password-reset',
              status: 'failed',
              response_code: 'Địa chỉ email thành viên không hợp lệ',
              smtp_config: smtpConfigForLog,
              html: compiledHtml
            });
          } catch (_) {}
        } else {
          try {
            const mailResult = await SmtpClient.sendMail({
              host: smtp.smtp_host,
              port: smtp.smtp_port,
              secure: smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
              user: smtp.smtp_user,
              pass: smtp.smtp_pass,
              fromEmail: smtp.smtp_from_email || smtp.smtp_user,
              fromName: smtp.smtp_from_name || siteName
            }, {
              to: targetEmail,
              subject: `[${siteName}] Đặt lại mật khẩu tài khoản thành công`,
              html: compiledHtml
            });

            if (mailResult && mailResult.success) {
              emailSent = true;
              emailMsg = `Đã gửi thông báo mật khẩu mới tới email ${targetEmail}`;

              try {
                await supabase.from('txa_email_logs').insert({
                  recipient: targetEmail,
                  sender: `${smtp.smtp_from_name || siteName} <${smtp.smtp_from_email || smtp.smtp_user}>`,
                  subject: `[${siteName}] Đặt lại mật khẩu tài khoản thành công`,
                  category: 'password-reset',
                  status: 'success',
                  response_code: mailResult.responseCode || '250 OK',
                  smtp_config: smtpConfigForLog,
                  html: compiledHtml
                });
              } catch (_) {}
            } else {
              emailMsg = `Lỗi gửi email SMTP: ${mailResult?.error || 'Thất bại'}`;
              try {
                await supabase.from('txa_email_logs').insert({
                  recipient: targetEmail,
                  sender: `${smtp.smtp_from_name || siteName} <${smtp.smtp_from_email || smtp.smtp_user}>`,
                  subject: `[${siteName}] Đặt lại mật khẩu tài khoản thành công`,
                  category: 'password-reset',
                  status: 'failed',
                  response_code: mailResult?.error || 'Lỗi gửi SMTP',
                  smtp_config: smtpConfigForLog,
                  html: compiledHtml
                });
              } catch (_) {}
            }
          } catch (eErr: any) {
            emailMsg = `Lỗi gửi email: ${eErr.message || 'Không thể kết nối máy chủ SMTP'}`;
            try {
              await supabase.from('txa_email_logs').insert({
                recipient: targetEmail,
                sender: `${smtp.smtp_from_name || siteName} <${smtp.smtp_from_email || smtp.smtp_user}>`,
                subject: `[${siteName}] Đặt lại mật khẩu tài khoản thành công`,
                category: 'password-reset',
                status: 'failed',
                response_code: eErr.message || 'Lỗi kết nối SMTP server',
                smtp_config: smtpConfigForLog,
                html: compiledHtml
              });
            } catch (_) {}
          }
        }
      } else {
        emailMsg = 'Hệ thống chưa bật SMTP nên không gửi email thông báo.';
      }

      return apiResponse({
        success: true,
        username: targetUser.username,
        email: targetUser.email,
        newPassword: newPassword,
        emailSent: emailSent,
        emailMsg: emailMsg,
        isSmtpEnabled: isSmtpEnabled
      }, 'success', `Reset mật khẩu cho tài khoản ${targetUser.username} thành công!`, 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

function generateStrongPassword(length: number = 12): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '@#$!%*?&';
  const all = uppers + lowers + numbers + symbols;

  let pwd = '';
  pwd += uppers[Math.floor(Math.random() * uppers.length)];
  pwd += lowers[Math.floor(Math.random() * lowers.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

function validateStrongPassword(password: string): boolean {
  if (!password || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasNumber && hasSpecial;
}

