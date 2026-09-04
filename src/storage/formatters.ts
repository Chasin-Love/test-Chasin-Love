/**
 * Formatting Utilities
 * Standardized formatters for byte sizes, calendar dates, and timestamps.
 */

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  if (n < 1099511627776) return `${(n / 1073741824).toFixed(2)} GB`;
  return `${(n / 1099511627776).toFixed(2)} TB`;
}

export function fmtDate(t: number): string {
  return new Date(t).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function fmtStamp(t: number): string {
  return new Date(t).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
