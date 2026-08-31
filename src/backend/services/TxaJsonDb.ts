import { SettingService } from './SettingService';

function getFsAndPath() {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    try {
      // Use indirect eval to prevent bundlers from attempting to resolve Node.js fs/path statically.
      const indirectEval = (0, eval);
      const req = indirectEval('require');
      return {
        fs: req('fs'),
        path: req('path')
      };
    } catch (e) {
      // Fallback
    }
  }
  return { fs: null, path: null };
}

function getDataDir(pathModule: any) {
  if (!pathModule) return '';
  return pathModule.resolve(process.cwd(), '../anh4-bot/data');
}

function ensureDir(fsModule: any, dataDir: string) {
  if (fsModule && dataDir && !fsModule.existsSync(dataDir)) {
    fsModule.mkdirSync(dataDir, { recursive: true });
  }
}

export function loadJson<T>(filename: string, defaultValue: T): T {
  const { fs, path } = getFsAndPath();
  if (!fs || !path) return defaultValue;

  const dataDir = getDataDir(path);
  ensureDir(fs, dataDir);
  const filePath = path.join(dataDir, filename);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (e) {
    console.error(`Lỗi khi đọc tệp JSON ${filename}:`, e);
    return defaultValue;
  }
}

export function saveJson<T>(filename: string, data: T) {
  const { fs, path } = getFsAndPath();
  if (!fs || !path) return;

  const dataDir = getDataDir(path);
  ensureDir(fs, dataDir);
  const filePath = path.join(dataDir, filename);

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Lỗi khi ghi tệp JSON ${filename}:`, e);
  }
}

export interface GiveawayItem {
  id: string;
  prize: string;
  winner_count: number;
  ends_at: string;
  channel_id: string;
  message_id: string;
  status: string; // 'active', 'ended'
  participants: string[];
  created_at: string;
}

export interface LeaderboardWinnerItem {
  month: string;
  user_id: string;
  score: number;
  created_at: string;
}

export interface DiscordLocalConfig {
  channels: {
    rules: string;
    xac_minh: string;
    yeu_cau_phim: string;
    boost: string;
    mod_log: string;
    report: string;
    chung: string;
    moi_cap_nhat: string;
    lich_chieu: string;
    bxh: string;
    give_away: string;
    dang_xem: string;
  };
  roles: {
    unverified: string;
    member: string;
    booster: string;
    level_mam_non: string;
    level_mot_phim: string;
    level_cuong_phim: string;
    level_truong_lao: string;
    top_1_month: string;
    top_1_consecutive: string;
    role_package_vip: string;
    role_package_standard: string;
    role_package_bypass_zalo: string;
  };
  schedule: {
    leaderboard_daily_time: string;
    leaderboard_monthly_time: string;
  };
  auto_mod: {
    auto_mute_warn_count: number;
    auto_mute_duration_minutes: number;
    auto_kick_warn_count: number;
    auto_ban_warn_count: number;
  };
}

export const TxaJsonDb = {
  // --- VIOLATIONS (Lưu trữ vi phạm cục bộ - fallback trên VPS) ---
  getViolations(): Record<string, number> {
    return loadJson<Record<string, number>>('violations.json', {});
  },

  saveViolations(violations: Record<string, number>) {
    saveJson<Record<string, number>>('violations.json', violations);
  },

  getViolationCount(discordId: string): number {
    const data = this.getViolations();
    return data[discordId] || 0;
  },

  incrementViolation(discordId: string): number {
    const data = this.getViolations();
    const count = (data[discordId] || 0) + 1;
    data[discordId] = count;
    this.saveViolations(data);
    return count;
  },

  clearViolations(discordId: string) {
    const data = this.getViolations();
    delete data[discordId];
    this.saveViolations(data);
  },

  // --- GIVEAWAYS ---
  getGiveaways(): GiveawayItem[] {
    return loadJson<GiveawayItem[]>('giveaways.json', []);
  },

  saveGiveaways(giveaways: GiveawayItem[]) {
    saveJson<GiveawayItem[]>('giveaways.json', giveaways);
  },

  createGiveaway(prize: string, winnerCount: number, endsAt: string, channelId: string, messageId: string): GiveawayItem {
    const list = this.getGiveaways();
    const newItem: GiveawayItem = {
      id: messageId,
      prize,
      winner_count: winnerCount,
      ends_at: endsAt,
      channel_id: channelId,
      message_id: messageId,
      status: 'active',
      participants: [],
      created_at: new Date().toISOString()
    };
    list.push(newItem);
    this.saveGiveaways(list);
    return newItem;
  },

  joinGiveaway(messageId: string, userId: string): { joined: boolean; already: boolean; count: number; reason?: string } {
    const list = this.getGiveaways();
    const giveaway = list.find(x => x.message_id === messageId);
    if (!giveaway) {
      return { joined: false, already: false, count: 0, reason: 'not_found' };
    }
    if (giveaway.status !== 'active') {
      return { joined: false, already: false, count: giveaway.participants.length, reason: 'ended' };
    }
    if (giveaway.participants.includes(userId)) {
      return { joined: true, already: true, count: giveaway.participants.length };
    }
    giveaway.participants.push(userId);
    this.saveGiveaways(list);
    return { joined: true, already: false, count: giveaway.participants.length };
  },

  endGiveaway(messageId: string): { status: string; prize: string; winner_ids: string[] } {
    const list = this.getGiveaways();
    const giveaway = list.find(x => x.message_id === messageId);
    if (!giveaway) {
      return { status: 'not_found', prize: '', winner_ids: [] };
    }
    if (giveaway.status === 'ended') {
      return { status: 'ended', prize: giveaway.prize, winner_ids: [] };
    }
    
    giveaway.status = 'ended';
    const participants = giveaway.participants;
    const winnerCount = Math.min(giveaway.winner_count, participants.length);
    
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    const winners = shuffled.slice(0, winnerCount);
    
    this.saveGiveaways(list);
    return { status: 'ended', prize: giveaway.prize, winner_ids: winners };
  },

  // --- LEADERBOARD WINNERS ---
  getLeaderboardWinners(): LeaderboardWinnerItem[] {
    return loadJson<LeaderboardWinnerItem[]>('leaderboard_winners.json', []);
  },

  saveLeaderboardWinners(winners: LeaderboardWinnerItem[]) {
    saveJson<LeaderboardWinnerItem[]>('leaderboard_winners.json', winners);
  },

  awardWinner(month: string, userId: string, score: number): LeaderboardWinnerItem {
    const list = this.getLeaderboardWinners();
    const filtered = list.filter(x => !(x.month === month && x.user_id === userId));
    const newItem: LeaderboardWinnerItem = {
      month,
      user_id: userId,
      score,
      created_at: new Date().toISOString()
    };
    filtered.push(newItem);
    this.saveLeaderboardWinners(filtered);
    return newItem;
  },

  // --- DISCORD LOCAL CONFIG (Lấy CSDL hoặc đọc file fallback) ---
  async getDiscordConfig(): Promise<DiscordLocalConfig> {
    const defaultConfig: DiscordLocalConfig = {
      channels: {
        rules: '',
        xac_minh: '',
        yeu_cau_phim: '',
        boost: '',
        mod_log: '',
        report: '',
        chung: '',
        moi_cap_nhat: '',
        lich_chieu: '',
        bxh: '',
        give_away: '',
        dang_xem: ''
      },
      roles: {
        unverified: '',
        member: '',
        booster: '',
        level_mam_non: '',
        level_mot_phim: '',
        level_cuong_phim: '',
        level_truong_lao: '',
        top_1_month: '',
        top_1_consecutive: '',
        role_package_vip: '',
        role_package_standard: '',
        role_package_bypass_zalo: ''
      },
      schedule: {
        leaderboard_daily_time: '23:00',
        leaderboard_monthly_time: '23:30'
      },
      auto_mod: {
        auto_mute_warn_count: 5,
        auto_mute_duration_minutes: 40,
        auto_kick_warn_count: 10,
        auto_ban_warn_count: 15
      }
    };

    try {
      const settings = await SettingService.getSettings();
      const discord = settings.discord;
      if (discord) {
        return {
          channels: {
            ...defaultConfig.channels,
            ...(discord.channels || {})
          },
          roles: {
            ...defaultConfig.roles,
            ...(discord.roles || {})
          },
          schedule: {
            ...defaultConfig.schedule,
            ...(discord.schedule || {})
          },
          auto_mod: {
            ...defaultConfig.auto_mod,
            ...(discord.auto_mod || {})
          }
        };
      }
    } catch (e) {
      console.error('Lỗi khi tải cấu hình Discord từ CSDL settings:', e);
    }

    // Fallback: local offline development
    try {
      const configFromFile = loadJson<DiscordLocalConfig>('config.json', defaultConfig);
      if (configFromFile) {
        return configFromFile;
      }
    } catch (e) {}

    return defaultConfig;
  }
};
