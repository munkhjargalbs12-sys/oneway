export function formatRideDate(value: unknown, fallback = "-") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const datePrefix = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (datePrefix) {
    return `${datePrefix[1]}-${datePrefix[2]}-${datePrefix[3]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toISOString().slice(0, 10);
}
