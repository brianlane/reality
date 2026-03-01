/**
 * Shared formatting helpers for admin tables and timelines.
 *
 * All functions return `null` for falsy / invalid input so callers can
 * provide their own fallback text (e.g. "N/A", "Never", "—").
 */

export function formatDateTime(
  val: string | Date | null | undefined,
): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

export function formatDateOnly(
  val: string | Date | null | undefined,
): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDuration(
  startVal: string | Date | null | undefined,
  endVal: string | Date | null | undefined,
): string | null {
  if (!startVal || !endVal) return null;
  const start = new Date(startVal);
  const end = new Date(endVal);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) return "< 1m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days > 0) return `${days}d ${remHours}h`;
  return `${hours}h ${minutes}m`;
}
