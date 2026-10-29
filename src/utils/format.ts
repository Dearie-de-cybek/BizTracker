const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

export function formatDate(d: Date, now = new Date()): string {
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "Today, 2:14 pm" / "Yesterday, 9:02 am" / "12 Oct, 4:30 pm" */
export function formatDateTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const day = sameDay(d, now) ? 'Today' : sameDay(d, y) ? 'Yesterday' : formatDate(d, now);
  return `${day}, ${formatTime(d)}`;
}

/** Section label for grouped lists */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, now)) return 'Today';
  if (sameDay(d, y)) return 'Yesterday';
  return `${DAYS[d.getDay()]} ${formatDate(d, now)}`;
}

export function weekdayShort(d: Date): string {
  return DAYS[d.getDay()].slice(0, 1);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}
