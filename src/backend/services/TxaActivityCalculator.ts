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

  // Đồng bộ vai trò Gói dịch vụ thành viên lên Discord theo tên gói động từ Website (Bỏ qua bypass_zalo)
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

      const headers = {
        'Authorization': `Bot ${discord.bot_token}`,
        'Content-Type': 'application/json'
      };

      // 1. Lấy danh sách gói cước từ website settings, lọc bỏ gói bypass_zalo và free
      const packagesList: any[] = (settings.packages || []).filter((p: any) => {
        const id = (p.id || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        return !id.includes('bypass') && !id.includes('zalo') && !title.includes('bypass') && !title.includes('zalo');
      });

      // 2. Lấy danh sách các vai trò hiện có trên Discord Guild
      let guildRoles: any[] = [];
      try {
        const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/roles`, { headers });
        if (rolesRes.ok) {
          guildRoles = await rolesRes.json() as any[];
        }
      } catch (e) {
        console.warn('Could not fetch guild roles from Discord:', e);
      }

      // 3. Tìm thông tin gói cước hiện tại của User
      const normalizedPkgParam = (packageName || 'free').toLowerCase();
      let targetUserPkg: any = null;
      if (normalizedPkgParam !== 'free') {
        targetUserPkg = packagesList.find((p: any) =>
          (p.id || '').toLowerCase() === normalizedPkgParam ||
          (p.title || '').toLowerCase() === normalizedPkgParam
        );
      }

      // Map các role ID tương ứng với từng gói cước
      const packageRoleMap = new Map<string, string>(); // packageTitle -> roleId

      for (const pkg of packagesList) {
        const pkgTitle = pkg.title || pkg.id;
        let matchedRole = guildRoles.find((r: any) => r.name?.toLowerCase() === pkgTitle.toLowerCase());
        
        // Nếu vai trò chưa có trên Discord server, tự động tạo mới
        if (!matchedRole && guildRoles.length > 0) {
          try {
            const isVip = (pkg.permissions?.vip_badge) || pkgTitle.toLowerCase().includes('vip') || pkgTitle.toLowerCase().includes('s');
            const colorRgb = isVip ? 15844367 : 3066993; // Gold for VIP, Emerald for Standard
            
            const createRes = await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/roles`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                name: pkgTitle,
                color: colorRgb,
                hoist: true,
                mentionable: false
              })
            });
            if (createRes.ok) {
              matchedRole = await createRes.json() as any;
              guildRoles.push(matchedRole);
            }
          } catch (e) {
            console.warn(`Could not create Discord role for package ${pkgTitle}:`, e);
          }
        }

        if (matchedRole) {
          packageRoleMap.set(pkgTitle, matchedRole.id);
        }
      }

      // Also support legacy fixed roles from settings.discord.roles if available
      const localConfig = await TxaJsonDb.getDiscordConfig();
      const legacyRoles = localConfig.roles || {};
      const allKnownPackageRoleIds = new Set<string>();

      for (const roleId of packageRoleMap.values()) {
        allKnownPackageRoleIds.add(roleId);
      }
      if (legacyRoles.role_package_vip) allKnownPackageRoleIds.add(legacyRoles.role_package_vip);
      if (legacyRoles.role_package_standard) allKnownPackageRoleIds.add(legacyRoles.role_package_standard);

      // 4. Xác định role ID nào cần gán cho người dùng hiện tại
      let targetRoleId: string | null = null;
      if (targetUserPkg) {
        const targetTitle = targetUserPkg.title || targetUserPkg.id;
        targetRoleId = packageRoleMap.get(targetTitle) || null;
        if (!targetRoleId && targetUserPkg.permissions?.vip_badge) {
          targetRoleId = legacyRoles.role_package_vip || null;
        } else if (!targetRoleId) {
          targetRoleId = legacyRoles.role_package_standard || null;
        }
      }

      // 5. Gỡ bỏ tất cả các role gói cước khác khỏi user
      for (const roleId of allKnownPackageRoleIds) {
        if (roleId && roleId !== targetRoleId) {
          try {
            await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${roleId}`, {
              method: 'DELETE',
              headers
            });
          } catch (e) {}
        }
      }

      // 6. Gán role gói cước mới cho user (nếu có)
      if (targetRoleId) {
        try {
          await fetch(`https://discord.com/api/v10/guilds/${discord.guild_id}/members/${discordId}/roles/${targetRoleId}`, {
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
