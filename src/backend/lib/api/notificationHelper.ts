import { supabase } from '@lib/supabase';
import { SmtpClient } from '@lib/api/smtpClient';
import { getEmailTemplate } from '@templates/emails/emailReader';

export async function sendEpisodeUpdateEmails(movieId: string, movieSlug: string, moviePayload: any, settings: any) {
  try {
    const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);
    if (!isSmtpConfigured) return;

    // 1. Query favorites for this movie
    const { data: favoritedUsers, error: favError } = await supabase
      .from('favorites')
      .select('user_id')
      .eq('movie_id', movieId);

    if (favError) {
      console.error(`[SMTP] Error querying favorites for movie ${movieId}:`, favError);
      return;
    }

    if (!favoritedUsers || favoritedUsers.length === 0) {
      return;
    }

    const userIds = favoritedUsers.map((fu: any) => fu.user_id).filter(Boolean);
    if (userIds.length === 0) return;

    // 2. Fetch user details (id, email, username, name)
    const { data: usersList, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, name')
      .in('id', userIds);

    if (usersError) {
      console.error(`[SMTP] Error fetching users for notifications:`, usersError);
      return;
    }

    if (!usersList || usersList.length === 0) return;

    // 3. Construct custom title and body based on movie type and episode status
    const isSingle = moviePayload.type === 'single' || 
                     moviePayload.type === 'movie' || 
                     moviePayload.episode_total === '1';

    const epCurrentStr = (moviePayload.episode_current || '').toLowerCase();
    const isLastEpisode = !isSingle && (
      moviePayload.status === 'completed' || 
      epCurrentStr.includes('end') || 
      epCurrentStr.includes('cuối') || 
      epCurrentStr.includes('hoàn') || 
      epCurrentStr.includes('trọn bộ') ||
      (moviePayload.episode_total && epCurrentStr.includes(moviePayload.episode_total))
    );

    let notifTitle = `Tập mới: ${moviePayload.title}`;
    let notifBody = `${moviePayload.episode_current} (${moviePayload.quality} - ${moviePayload.lang}) đã được cập nhật thành công. Xem ngay thôi!`;

    if (isSingle) {
      notifTitle = `Bản chiếu mới: ${moviePayload.title}`;
      notifBody = `Phim đã cập nhật bản chiếu ${moviePayload.quality} (${moviePayload.lang}). Xem ngay tại DongMePhim!`;
    } else if (isLastEpisode) {
      notifTitle = `Tập cuối trọn bộ: ${moviePayload.title}`;
      notifBody = `${moviePayload.episode_current} đã chính thức cập nhật! Phim đã trọn bộ, xem ngay kẻo lỡ!`;
    }

    // 4. Batch insert notifications into Supabase notifications table
    const notificationsToInsert = usersList.map((user: any) => ({
      user_id: user.id,
      title: notifTitle,
      body: notifBody,
      image_url: moviePayload.poster_url || "",
      is_read: false,
      created_at: new Date().toISOString(),
      movie_slug: movieSlug,
      episode_name: moviePayload.episode_current
    }));

    if (notificationsToInsert.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);
      
      if (notifError) {
        console.error('[Notification] Error inserting notifications:', notifError);
      }
    }

    // 5. Load email template
    const htmlTemplate = getEmailTemplate('movie-episode-update.html');
    const siteUrl = settings.general.site_url || 'https://dongmephim.online';
    const siteName = settings.general.site_name || 'DongMePhim';
    const movieLink = `${siteUrl.replace(/\/$/, '')}/phim/${movieSlug}`;
    const year = new Date().getFullYear().toString();

    // 6. Send emails to each user
    for (const user of usersList) {
      if (!user.email) continue;
      
      const recipientName = user.name || user.username || 'Bạn';
      const compiledHtml = htmlTemplate
        .replace(/{name}/g, recipientName)
        .replace(/{movie_title}/g, moviePayload.title)
        .replace(/{episode_current}/g, moviePayload.episode_current)
        .replace(/{movie_link}/g, movieLink)
        .replace(/{site_name}/g, siteName)
        .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
        .replace(/{year}/g, year);

      try {
        const sendResult = await SmtpClient.sendMail({
          host: settings.smtp.smtp_host,
          port: settings.smtp.smtp_port,
          secure: settings.smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
          user: settings.smtp.smtp_user,
          pass: settings.smtp.smtp_pass,
          fromEmail: settings.smtp.smtp_from_email,
          fromName: settings.smtp.smtp_from_name,
        }, {
          to: user.email,
          subject: `[Tập Mới] Phim "${moviePayload.title}" đã cập nhật: ${moviePayload.episode_current}!`,
          html: compiledHtml
        });

        // Log successful email
        await supabase.from('txa_email_logs').insert({
          recipient: user.email,
          sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
          subject: `[Tập Mới] Phim "${moviePayload.title}" đã cập nhật: ${moviePayload.episode_current}!`,
          category: 'Movie Update Notification',
          status: 'success',
          response_code: sendResult.responseCode || '250 OK',
          parameters: { username: user.username, email: user.email, movie_slug: movieSlug },
          smtp_config: {
            host: settings.smtp.smtp_host,
            port: settings.smtp.smtp_port,
            secure: settings.smtp.smtp_secure,
            user: settings.smtp.smtp_user
          },
          html: compiledHtml
        });
      } catch (err: any) {
        console.error(`[SMTP ERROR] Failed to send episode update email to ${user.email}:`, err);
        // Log failed email
        try {
          await supabase.from('txa_email_logs').insert({
            recipient: user.email,
            sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
            subject: `[Tập Mới] Phim "${moviePayload.title}" đã cập nhật: ${moviePayload.episode_current}!`,
            category: 'Movie Update Notification',
            status: 'failed',
            response_code: err.message || 'Lỗi kết nối SMTP server',
            parameters: { username: user.username, email: user.email, movie_slug: movieSlug },
            smtp_config: {
              host: settings.smtp.smtp_host,
              port: settings.smtp.smtp_port,
              secure: settings.smtp.smtp_secure,
              user: settings.smtp.smtp_user
            },
            html: compiledHtml
          });
        } catch (_) {}
      }
    }
  } catch (e) {
    console.error(`[SMTP] Critical error in sendEpisodeUpdateEmails:`, e);
  }
}
