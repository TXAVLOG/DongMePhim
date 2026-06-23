import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPackageIdByTitle(title: string): string {
  const t = (title || '').toLowerCase().trim();
  if (t.includes('vip') || t.includes('premium') || t.includes('year') || t.includes('month') || t.includes('năm') || t.includes('tháng')) return 'vip';
  if (t.includes('free') || t.includes('miễn') || t.includes('thường') || t.includes('mặc định') || t === '') return 'free';
  return 'free';
}
