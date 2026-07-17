import fs from 'fs';
import path from 'path';

// Đường dẫn tuyệt đối tới thư mục anh4-bot/data
const DATA_DIR = path.resolve(process.cwd(), '../anh4-bot/data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadJson<T>(filename: string, defaultValue: T): T {
  ensureDir();
  const filePath = path.join(DATA_DIR, filename);
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
  ensureDir();
  const filePath = path.join(DATA_DIR, filename);
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
  participants: string[]; // Danh sách user_id đã liên kết
  created_at: string;
}

export interface LeaderboardWinnerItem {
  month: string;
  user_id: string;
  score: number;
  created_at: string;
}

export const TxaJsonDb = {
  // --- VIOLATIONS (Lưu trữ vi phạm cục bộ) ---
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
  }
};
