export function formatDuration(durationMs: number) {
  if (durationMs <= 0) {
    return "not started";
  }

  const minutes = Math.max(1, Math.round(durationMs / 60000));
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRelativeTime(isoDate: string) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
