export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['blue', 'green', 'orange', 'purple', 'red'];
export function avatarColor(name) {
  let hash = 0;
  for (const ch of (name || '')) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function relativeDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const todayMs = new Date(new Date().toDateString()).getTime();
  const dateMs  = new Date(d.toDateString()).getTime();
  const diffDays = Math.round((todayMs - dateMs) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return `${diffDays} days ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function matchSearch(obj, fields, query) {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return fields.some(f => (obj[f] ?? '').toString().toLowerCase().includes(q));
}
