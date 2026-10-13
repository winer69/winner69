export const formatChips = (value) => `฿${Math.max(0, Math.round(value || 0)).toLocaleString('en-US')}`;

/** ย่อเลขบนมือถือ เช่น 12,450 → 12.4K */
export function formatShort(value) {
  const v = Math.round(value || 0);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return v.toLocaleString('en-US');
}

export const signed = (value) => `${value >= 0 ? '+' : '-'}${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
