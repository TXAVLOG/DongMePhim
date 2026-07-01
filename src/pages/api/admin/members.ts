import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
import { getEmailTemplate } from '@templates/emails/emailReader';
import { SmtpClient } from '@lib/api/smtpClient';

// GET: Lấy danh sách thành viên từ Supabase
export const GET: APIRoute = async ({ request }) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Ánh xạ các trường từ database sang định dạng frontend mong muốn
    const mappedUsers = users.map((u: any) => ({
      username: u.username,
      email: u.email,
      password: u.password,
      name: u.name || 'Người dùng',
      role: u.role || 'user',
      roles: u.role || 'users', // Hỗ trợ cả 2 định dạng
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
    }));

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

      const emailHash = Math.random().toString(36).substring(2, 10); // Simple fallback/mock gravatar hash
      const { error } = await supabase
        .from('users')
        .insert({
          username,
          email,
          password: password || '123456', // default pass if empty
          role: role || roles || 'user',
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
      if (password !== undefined) updates.password = password;
      if (role !== undefined || roles !== undefined) updates.role = role || roles;
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
        try {
          const settings = await SettingService.getSettings();
          const siteUrl = settings.general?.site_url || 'https://dongmephim.online';
          const siteName = settings.general?.site_name || 'DongMePhim';
          const year = new Date().getFullYear().toString();
          
          const expDateVal = updates.expiry_date || null;
          const formattedExpiry = expDateVal 
            ? new Date(expDateVal).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
            : 'Vô thời hạn';

          const packagesList = settings.packages || [];
          const resolvedPkg = packagesList.find((p: any) => p.id === newPkg || p.title === newPkg);

          // 1. Send success email to user
          const successTemplate = getEmailTemplate('content-purchase-success.html');
          const userEmailContent = successTemplate
            .replace(/{name}/g, targetUsername)
            .replace(/{username}/g, targetUsername)
            .replace(/{package_title}/g, resolvedPkg?.title || newPkg)
            .replace(/{expiry_date}/g, formattedExpiry)
            .replace(/{site_name}/g, siteName)
            .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''));
            
          const userHtml = getEmailTemplate('verify-email.html')
            .replace(/{name}/g, targetUsername)
            .replace(/{verification_content}/g, userEmailContent)
            .replace(/{site_name}/g, siteName)
            .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
            .replace(/{year}/g, year);

          await SmtpClient.sendMail({
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
          const adminEmail = settings.smtp.smtp_user;
          if (adminEmail) {
            const adminTemplate = getEmailTemplate('content-purchase-admin.html');
            const adminEmailContent = adminTemplate
              .replace(/{username}/g, targetUsername)
              .replace(/{email}/g, finalEmail)
              .replace(/{package_title}/g, resolvedPkg?.title || newPkg)
              .replace(/{expiry_date}/g, formattedExpiry)
              .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''));
              
            const adminHtml = getEmailTemplate('verify-email.html')
              .replace(/{name}/g, 'Admin')
              .replace(/{verification_content}/g, adminEmailContent)
              .replace(/{site_name}/g, siteName)
              .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
              .replace(/{year}/g, year);

            await SmtpClient.sendMail({
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
          await supabase.from('txa_email_logs').insert([
            {
              recipient: finalEmail,
              sender: settings.smtp.smtp_user,
              subject: `[${siteName}] Kích hoạt thành công gói cước ${resolvedPkg?.title || newPkg}`,
              category: 'purchase-success',
              status: 'success'
            },
            {
              recipient: adminEmail,
              sender: settings.smtp.smtp_user,
              subject: `[${siteName}] Thông báo: Có thành viên mới mua gói cước`,
              category: 'purchase-admin-notification',
              status: 'success'
            }
          ]);
        } catch (emailErr) {
          console.error('Error sending member edit purchase notification emails:', emailErr);
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
          updates.role = bulkAction.substring(5);
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

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
