const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(time: number = Date.now()): string {
  const d = new Date(time);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = dayKeyToDate(key);
  date.setDate(date.getDate() + days);
  return dayKey(date.getTime());
}

export function dayLabel(time: number, now: number = Date.now()): string {
  const key = dayKey(time);
  if (key === dayKey(now)) {
    return 'Hôm nay';
  }
  if (key === dayKey(now - DAY_MS)) {
    return 'Hôm qua';
  }
  return formatDate(time, true);
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function formatDate(time: number, withWeekday = false): string {
  const d = new Date(time);
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}/${d.getFullYear()}`;
  return withWeekday ? `${WEEKDAYS[d.getDay()]}, ${date}` : date;
}

export function formatTime(time: number): string {
  const d = new Date(time);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

export function formatRelative(time: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return 'vừa xong';
  }
  if (minutes < 60) {
    return `${minutes} phút trước`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} giờ trước`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} ngày trước`;
  }
  return formatDate(time);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) {
    return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
  }
  if (m > 0) {
    return `${m} phút`;
  }
  return `${s} giây`;
}

export function groupByDay<T>(
  items: readonly T[],
  getTime: (item: T) => number,
): { title: string; key: string; data: T[] }[] {
  const groups = new Map<string, { title: string; key: string; data: T[] }>();
  for (const item of items) {
    const time = getTime(item);
    const key = dayKey(time);
    let group = groups.get(key);
    if (!group) {
      group = { title: dayLabel(time), key, data: [] };
      groups.set(key, group);
    }
    group.data.push(item);
  }
  return [...groups.values()];
}

export { DAY_MS };
