export const nf = (n: number | string) =>
  new Intl.NumberFormat().format(typeof n === 'string' ? Number(n) : n);

export const pct = (v?: number | null) =>
  v == null ? '' : `${v > 0 ? '↑' : '↓'} ${Math.abs(v).toFixed(1)}%`;

export const truncateMiddle = (str: string, max = 80) => {
  if (str.length <= max) return str;
  const keep = Math.floor((max - 3) / 2);
  return str.slice(0, keep) + '…' + str.slice(-keep);
};
