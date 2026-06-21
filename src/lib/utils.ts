import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPackageIdByTitle(title: string): string {
  const t = (title || '').toLowerCase().trim();
  if (t.includes('year') || t.includes('1 năm') || t.includes('1y') || t.includes('năm') || t.includes('vip 1 năm') || t.includes('vip_1y')) return 'vip_1y';
  if (t.includes('month') || t.includes('1 tháng') || t.includes('1m') || t.includes('tháng') || t.includes('premium') || t.includes('vip 1 tháng') || t.includes('vip_1m')) return 'vip_1m';
  if (t.includes('free') || t.includes('miễn') || t.includes('thường') || t.includes('mặc định') || t === '') return 'free';
  return 'free';
}
