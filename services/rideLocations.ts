type RideLocationKind = "start" | "end";

function normalizeText(value: unknown) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function appendUnique(parts: string[], value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return;

  const exists = parts.some((part) => part.toLowerCase() === normalized.toLowerCase());
  if (!exists) {
    parts.push(normalized);
  }
}

function withMongolianSuffix(value: string, suffix: string) {
  if (!value) return "";
  return value.toLowerCase().includes(suffix.toLowerCase()) ? value : `${value} ${suffix}`;
}

function formatKhoroo(value: string) {
  if (!value) return "";
  if (value.toLowerCase().includes("хороо")) return value;
  if (/^\d+$/.test(value)) return `${value}-р хороо`;
  return value;
}

export function formatOfficialAddressFromGeocode(address: any, fallback = "") {
  const parts: string[] = [];

  appendUnique(parts, address?.city || address?.region);

  const district = normalizeText(address?.district);
  if (district) {
    appendUnique(parts, withMongolianSuffix(district, "дүүрэг"));
  }

  const khoroo = normalizeText(address?.subregion);
  if (khoroo && khoroo.toLowerCase() !== district.toLowerCase()) {
    appendUnique(parts, formatKhoroo(khoroo));
  }

  appendUnique(parts, address?.street);
  appendUnique(parts, address?.streetNumber);
  appendUnique(parts, address?.name);

  return parts.join(", ") || normalizeText(fallback);
}

function firstText(values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }

  return "";
}

export function getRideLocationDisplay(
  ride: any,
  kind: RideLocationKind,
  fallback: string
) {
  const isStart = kind === "start";
  const legacy = isStart ? ride?.start_location : ride?.end_location;
  const official = firstText(
    isStart
      ? [ride?.start_address, ride?.startAddress]
      : [ride?.end_address, ride?.endAddress]
  ) || normalizeText(legacy) || fallback;
  const manual = firstText(
    isStart
      ? [ride?.start_place_name, ride?.startPlaceName, legacy]
      : [ride?.end_place_name, ride?.endPlaceName, legacy]
  );

  return {
    official,
    manual: manual && manual.toLowerCase() !== official.toLowerCase() ? manual : "",
  };
}

export function getRideRouteTitle(ride: any) {
  const start = getRideLocationDisplay(ride, "start", "Эхлэх газар тодорхойгүй");
  const end = getRideLocationDisplay(ride, "end", "Очих газар тодорхойгүй");
  return `${start.official} → ${end.official}`;
}
