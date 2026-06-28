import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

// GET: Lấy lịch sử giao dịch thanh toán
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const username = url.searchParams.get('username');
    const txid = url.searchParams.get('txid');

    // 1. Nếu lấy theo mã giao dịch cụ thể
    if (txid) {
      const { data: log, error } = await supabase
        .from('txa_payment_logs')
        .select('*')
        .eq('txid', txid)
        .maybeSingle();

      if (error) throw error;
      if (!log) {
        return apiResponse(null, 'success', 'No record found', 200, request);
      }
      const mappedLog = {
        txid: log.txid,
        username: log.username,
        email: log.email || '',
        packageTitle: log.package_title,
        price: Number(log.price),
        cycle: log.cycle,
        method: log.method,
        status: log.status,
        receiptImg: log.receipt_img || '',
        note: log.note || log.client_info || '',
        date: log.created_at
      };
      return apiResponse(mappedLog, 'success', '', 200, request);
    }

    // 2. Nếu lấy danh sách giao dịch cho admin hoặc người dùng cụ thể
    let query = supabase.from('txa_payment_logs').select('*').order('created_at', { ascending: false });

    // Nếu không phải admin (username !== 'admin') và có username -> Lọc theo username
    if (username && username !== 'admin') {
      query = query.eq('username', username);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    // Ánh xạ lại cấu trúc ngày tháng cũ cho tương thích với client-side
    const mappedLogs = (logs || []).map((l: any) => ({
      txid: l.txid,
      username: l.username,
      email: l.email || '',
      packageTitle: l.package_title,
      price: Number(l.price),
      cycle: l.cycle,
      method: l.method,
      status: l.status,
      receiptImg: l.receipt_img || '',
      note: l.note || l.client_info || '',
      date: l.created_at
    }));

    return apiResponse(mappedLogs, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Lưu hoặc cập nhật lịch sử thanh toán
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as any;
    const { txid, username, email, packageTitle, price, cycle, method, status, receiptImg, note, clientInfo } = body;
    const clientNote = note || clientInfo || null;

    if (!txid || !username || !packageTitle) {
      return apiResponse(null, 'error', 'Missing txid, username or packageTitle', 400, request);
    }

    let finalReceiptImg = receiptImg;

    if (receiptImg && receiptImg.startsWith('data:image/')) {
      try {
        // Tự động kiểm tra / tạo bucket 'receipts' nếu chưa có
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasReceiptsBucket = buckets?.some(b => b.name === 'receipts');
        if (!hasReceiptsBucket) {
          await supabase.storage.createBucket('receipts', {
            public: true,
            fileSizeLimit: 15 * 1024 * 1024 // 15MB
          });
        }
      } catch (e) {
        console.warn('Could not check or create bucket receipts:', e);
      }

      const matches = receiptImg.match(/^data:(image\/\w+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        let extension = 'png';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
          extension = 'jpg';
        } else if (mimeType.includes('png')) {
          extension = 'png';
        } else if (mimeType.includes('gif')) {
          extension = 'gif';
        } else if (mimeType.includes('webp')) {
          extension = 'webp';
        }

        // Đặt tên file: txa_(username)_(nội dung ck/txid).{ext}
        const fileName = `txa_${username}_${txid}.${extension}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading receipt to storage:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName);
          finalReceiptImg = publicUrl;
        }
      }
    }

    if ((status || 'pending') === 'pending') {
      try {
        await supabase
          .from('txa_payment_logs')
          .delete()
          .eq('username', username)
          .eq('status', 'pending');
      } catch (cleanupErr) {
        console.warn('Error cleaning up previous pending payments:', cleanupErr);
      }
    }

    const upsertPayload: any = {
      txid,
      username,
      email: email || null,
      package_title: packageTitle,
      price: Number(price) || 0,
      cycle: cycle || 'monthly',
      method: method || 'manual',
      status: status || 'pending',
      receipt_img: finalReceiptImg || null,
      updated_at: new Date().toISOString()
    };
    if (clientNote) {
      upsertPayload.note = clientNote;
    }

    const { error } = await supabase
      .from('txa_payment_logs')
      .upsert(upsertPayload, { onConflict: 'txid' });

    if (error) throw error;

    // Nếu trạng thái là 'approved' và đây là gói Key Bypass Zalo -> Tự động sinh mã Key và gửi Email cho khách
    if (status === 'approved' && (packageTitle.toLowerCase().includes('bypass') || packageTitle.toLowerCase().includes('zalo') || packageTitle.toLowerCase().includes('key'))) {
      try {
        const { ZaloService } = await import('@services/ZaloService');
        const { SettingService } = await import('@services/SettingService');
        const { SmtpClient } = await import('@lib/api/smtpClient');
        const { getEmailTemplate } = await import('@templates/emails/emailReader');

        let durationMonths = 1;
        if (cycle === 'annual') {
          durationMonths = 12;
        } else if (cycle === '6months') {
          durationMonths = 6;
        } else if (cycle === '3months') {
          durationMonths = 3;
        } else if (cycle && cycle.startsWith('custom_')) {
          const parts = cycle.split('_');
          if (parts.length >= 2) {
            durationMonths = parseInt(parts[1]) || 1;
          }
        }

        const keyRecord = await ZaloService.createBypassKey({
          packageTitle: packageTitle,
          durationMonths: durationMonths,
          email: email || null,
          note: clientNote || null,
          maxDevices: 15
        });

        // Gửi Mail cho người dùng nếu có cấu hình SMTP và email người nhận
        if (email) {
          const settings = await SettingService.getSettings();
          const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);
          if (isSmtpConfigured) {
            const siteUrl = settings.general.site_url || 'https://dongmephim.online';
            const siteName = settings.general.site_name || 'DongMePhim';
            const year = new Date().getFullYear().toString();
            const expDateStr = new Date(keyRecord.expiry_date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

            const htmlTemplate = getEmailTemplate('zalo-key-issued-user.html');
            const compiledHtml = htmlTemplate
              .replace(/{package_title}/g, packageTitle)
              .replace(/{key_code}/g, keyRecord.key_code)
              .replace(/{expiry_date}/g, expDateStr)
              .replace(/{site_name}/g, siteName)
              .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
              .replace(/{year}/g, year);

            await SmtpClient.sendMail({
              host: settings.smtp.smtp_host,
              port: settings.smtp.smtp_port,
              secure: settings.smtp.smtp_secure as any,
              user: settings.smtp.smtp_user,
              pass: settings.smtp.smtp_pass,
              fromEmail: settings.smtp.smtp_from_email,
              fromName: settings.smtp.smtp_from_name,
            }, {
              to: email,
              subject: `[${siteName}] Mã Key Bypass Duyệt Zalo của bạn: ${keyRecord.key_code}`,
              html: compiledHtml
            });
          }
        }
      } catch (keyErr) {
        console.error('Lỗi khi tự động phát hành mã Key Bypass cho đơn hàng:', keyErr);
      }
    }

    return apiResponse({ success: true }, 'success', 'Lưu nhật ký giao dịch thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// DELETE: Xóa đơn hàng chưa thanh toán (pending) khi người dùng hủy hoặc quay lại
export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const txid = url.searchParams.get('txid');
    const username = url.searchParams.get('username');

    if (!txid && !username) {
      return apiResponse(null, 'error', 'Missing txid or username', 400, request);
    }

    let query = supabase.from('txa_payment_logs').delete();
    if (txid) {
      query = query.eq('txid', txid);
    } else if (username) {
      query = query.eq('username', username).eq('status', 'pending');
    }

    const { error } = await query;
    if (error) throw error;

    return apiResponse({ success: true }, 'success', 'Đã xóa đơn hàng dở dang!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
