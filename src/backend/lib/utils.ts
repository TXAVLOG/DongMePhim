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

export function isServerAllowed(allowedServers: string[] | undefined | null, serverName: string | undefined | null): boolean {
  if (!serverName) return false;
  
  const allowedList = (allowedServers && allowedServers.length > 0)
    ? allowedServers
    : ["Vietsub", "Thuyết Minh", "Lồng Tiếng"];

  const target = serverName.toLowerCase().trim();
  const targetClean = target.replace(/#\d+/g, '').replace(/[-_]/g, ' ').trim();

  return allowedList.some((s: string) => {
    if (!s) return false;
    const allowed = s.toLowerCase().trim();
    if (allowed === '*' || allowed === 'all' || allowed === 'tất cả') return true;

    const allowedClean = allowed.replace(/#\d+/g, '').replace(/[-_]/g, ' ').trim();

    if (target === allowed || targetClean === allowedClean) return true;
    if (target.includes(allowed) || allowed.includes(target)) return true;
    if (targetClean.includes(allowedClean) || allowedClean.includes(targetClean)) return true;

    return false;
  });
}

