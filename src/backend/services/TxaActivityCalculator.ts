import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
import { TxaJsonDb } from '@services/TxaJsonDb';

export interface UserStats {
  user_id: string;
  total_watch_seconds: number;
  total_ratings: number;
  total_comments: number;
  discord_message_count: number;
  level: string;
  violation_count: number;
}

export const LEVEL_THRESHOLDS = {
  'Mầm Non': { min: 0, max: 99 },
  'Mọt Phim': { min: 100, max: 499 },
  'Cuồng Phim': { min: 500, max: 1999 },
  'Trưởng Lão Cinephile': { min: 2000, max: Infinity }
};

export const TxaActivityCalculator = {
  // Điểm tích lũy = (số giờ xem * 10) + (số đánh giá * 15) + (số bình luận * 5) + (số tin nhắn chat Discord * 1)
  calculatePoints(stats: UserStats): number {
    const watchHours = stats.total_watch_seconds / 3600;
    return Math.floor(watchHours * 10 + stats.total_ratings * 15 + stats.total_comments * 5 + stats.discord_message_count * 1);
  },

  determineLevel(points: number): string {
    if (points >= 2000) return 'Trưởng Lão Cinephile';
    if (points >= 500) return 'Cuồng Phim';
    if (points >= 100) return 'Mọt Phim';
    return 'Mầm Non';
  },

  // Truy vấn/Tạo mới stats trên Database (Server)
  async getOrCreateStats(userId: string): Promise<UserStats> {
    const { data, error } = await supabase
      .from('txa_user_activity_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Lỗi truy vấn txa_user_activity_stats từ Supabase:', error);
    }

    if (data) {
      return data as UserStats;
    }

    // Nếu chưa có, tạo mới trên Server Supabase
    const newStats: Partial<UserStats> = {
      user_id: userId,
      total_watch_seconds: 0,
      total_ratings: 0,
      total_comments: 0,
      discord_message_count: 0,
      level: 'Mầm Non',
      violation_count: 0
    };

    const { data: inserted, error: insertError } = await supabase
      .from('txa_user_activity_stats')
      .insert(newStats)
      .select()
      .single();

    if (insertError) {
      console.error('Lỗi khởi tạo txa_user_activity_stats trên Supabase:', insertError);
      return { ...newStats, level: 'Mầm Non' } as UserStats;
    }

    return inserted as UserStats;
  },

  // Tăng điểm xem phim (Lưu server)
  async incrementWatchTime(userId: string, seconds: number): Promise<void> {
    try {
      const stats = await this.getOrCreateStats(userId);
      const newWatchSeconds = stats.total_watch_seconds + seconds;
      
      await supabase
        .from('txa_user_activity_stats')
        .update({ total_watch_seconds: newWatchSeconds, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      await this.recalculateLevel(userId);
    } catch (e) {
      console.error('Lỗi khi incrementWatchTime:', e);
    }
  },

  // Tăng điểm viết bình luận (Lưu server)
  async incrementComments(userId: string): Promise<void> {
    try {
      const stats = await this.getOrCreateStats(userId);
      const newComments = stats.total_comments + 1;

      await supabase
        .from('txa_user_activity_stats')
        .update({ total_comments: newComments, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      await this.recalculateLevel(userId);
    } catch (e) {
      console.error('Lỗi khi incrementComments:', e);
    }
  },

  // Tăng điểm chấm điểm/đánh giá phim (Lưu server)
  async incrementRatings(userId: string): Promise<void> {
    try {
      const stats = await this.getOrCreateStats(userId);
      const newRatings = stats.total_ratings + 1;

      await supabase
        .from('txa_user_activity_stats')
        .update({ total_ratings: newRatings, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      await this.recalculateLevel(userId);
    } catch (e) {
      console.error('Lỗi khi incrementRatings:', e);
    }
  },

  // Tăng điểm nhắn tin Discord (Độc lập lưu vào server Supabase)
  async incrementDiscordChat(discordId: string): Promise<void> {
    try {
      // Tìm liên kết kết nối từ bảng txa_discord_connections trong Supabase
      const { data: connection, error: connError } = await supabase
        .from('txa_discord_connections')
        .select('user_id')
        .eq('discord_id', discordId)
        .maybeSingle();

      if (connError || !connection) {
        // Tài khoản chưa liên kết -> không tích lũy điểm chat
        return;
      }

      const userId = connection.user_id;
      const stats = await this.getOrCreateStats(userId);
      const newChatCount = stats.discord_message_count + 1;

      await supabase
        .from('txa_user_activity_stats')
        .update({ discord_message_count: newChatCount, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      await this.recalculateLevel(userId);
    } catch (e) {
      console.error('Lỗi khi incrementDiscordChat:', e);
    }
  },

  // Tính toán lại level dựa trên điểm và cập nhật lên server
  async recalculateLevel(userId: string): Promise<string> {
    const stats = await this.getOrCreateStats(userId);
    const points = this.calculatePoints(stats);
    const newLevel = this.determineLevel(points);

    if (stats.level !== newLevel) {
      // Cập nhật level mới vào database trên server
      await supabase
        .from('txa_user_activity_stats')
        .update({ level: newLevel, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      // Kích hoạt đồng bộ vai trò lên Discord
      await this.syncDiscordLevelRoles(userId, newLevel, stats.level);
    }

    return newLevel;
  },

  // Đồng bộ vai trò Cấp độ hoạt động lên Discord
  async syncDiscordLevelRoles(userId: string, newLevel: string, oldLevel: string): Promise<void> {
    try {
      // Tìm kết nối Discord ID từ database Supabase
      const { data: connection } = await supabase
        .from('txa_discord_connections')
        .select('discord_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!connection) return;

      const discordId = connection.discord_id;
      const settings = await SettingService.getSettings();
      const discord = settings.discord;

      if (!discord || !discord.bot_token || !discord.guild_id) {
        return;
      }

      // Đọc vai trò từ cấu hình local JSON
      const localConfig = await TxaJsonDb.getDiscordConfig();
      const roles = localConfig.roles;

      const roleMap: Record<string, string | undefined> = {
        'Mầm Non': roles.level_mam_non,
        'Mọt Phim': roles.level_mot_phim,
        'Cuồng Phim': roles.level_cuong_phim,
        'Trưởng Lão Cinephile': roles.level_truong_lao
      };

      const roleToAdd = roleMap[newLevel];
      const rolesToRemove = Object.keys(roleMap)
        .filter(lvl => lvl !== newLevel)
        .map(lvl => roleMap[lvl])
        .filter(Boolean) as string[];

      const headers = {
        'Authorization': `Bot ${discord.bot_token}`,
        'Content-Type': 'application/json'
      };

      // Tháo các role cũ
      for (const roleId of rolesToRemove) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roleId}`, {
            method: 'DELETE',
            headers
          });
        } catch (e) {}
      }

      // Gán role mới
      if (roleToAdd) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roleToAdd}`, {
            method: 'PUT',
            headers
          });
        } catch (e) {}
      }
    } catch (e) {
      console.error('Lỗi khi syncDiscordLevelRoles:', e);
    }
  },

  // Đồng bộ vai trò Gói dịch vụ thành viên lên Discord
  async syncMemberPackageRoles(userId: string, packageName: string): Promise<void> {
    try {
      // Tìm kết nối Discord ID từ database Supabase
      const { data: connection } = await supabase
        .from('txa_discord_connections')
        .select('discord_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!connection) return;

      const discordId = connection.discord_id;
      const settings = await SettingService.getSettings();
      const discord = settings.discord;

      if (!discord || !discord.bot_token || !discord.guild_id) {
        return;
      }

      // Đọc vai trò từ cấu hình local JSON
      const localConfig = await TxaJsonDb.getDiscordConfig();
      const roles = localConfig.roles;

      const packageRoles: Record<string, string | undefined> = {
        'vip': roles.role_package_vip,
        'standard': roles.role_package_standard,
        'bypass_zalo': roles.role_package_bypass_zalo
      };

      const normalizedPackage = (packageName || 'free').toLowerCase();
      const roleToAdd = packageRoles[normalizedPackage];
      const rolesToRemove = Object.keys(packageRoles)
        .filter(pkg => pkg !== normalizedPackage)
        .map(pkg => packageRoles[pkg])
        .filter(Boolean) as string[];

      const headers = {
        'Authorization': `Bot ${discord.bot_token}`,
        'Content-Type': 'application/json'
      };

      // Xóa vai trò gói khác
      for (const roleId of rolesToRemove) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roleId}`, {
            method: 'DELETE',
            headers
          });
        } catch (e) {}
      }

      // Thêm vai trò gói hiện tại
      if (roleToAdd) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roleToAdd}`, {
            method: 'PUT',
            headers
          });
        } catch (e) {}
      }
    } catch (e) {
      console.error('Lỗi khi syncMemberPackageRoles:', e);
    }
  }
};
