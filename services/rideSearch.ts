export type RideScope = "local" | "intercity";

const EARTH_RADIUS_METERS = 6371000;
const INTERCITY_MIN_DISTANCE_METERS = 50000;

export function getRadiusOptions(scope: RideScope) {
  return scope === "intercity" ? [1000, 5000, 10000] : [100, 500, 1000];
}

export function getDefaultRadius(scope: RideScope) {
  return getRadiusOptions(scope)[1];
}

export function formatRadiusLabel(radiusMeters: number) {
  if (radiusMeters >= 1000) {
    const kilometers = radiusMeters / 1000;
    return Number.isInteger(kilometers) ? `${kilometers} км` : `${kilometers.toFixed(1)} км`;
  }

  return `${radiusMeters} м`;
}

function toNumber(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineMeters(
  first: { lat?: number; lng?: number } | null | undefined,
  second: { lat?: number; lng?: number } | null | undefined
) {
  const firstLat = toNumber(first?.lat);
  const firstLng = toNumber(first?.lng);
  const secondLat = toNumber(second?.lat);
  const secondLng = toNumber(second?.lng);

  if (
    firstLat === null ||
    firstLng === null ||
    secondLat === null ||
    secondLng === null
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const latDelta = toRadians(secondLat - firstLat);
  const lngDelta = toRadians(secondLng - firstLng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(firstLat)) *
      Math.cos(toRadians(secondLat)) *
      Math.sin(lngDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getRideScope(ride: any): RideScope {
  const startLat = toNumber(ride?.start_lat);
  const startLng = toNumber(ride?.start_lng);
  const endLat = toNumber(ride?.end_lat);
  const endLng = toNumber(ride?.end_lng);

  if (startLat === null || startLng === null || endLat === null || endLng === null) {
    return "local";
  }

  const tripDistance = haversineMeters(
    { lat: startLat, lng: startLng },
    { lat: endLat, lng: endLng }
  );

  return tripDistance >= INTERCITY_MIN_DISTANCE_METERS ? "intercity" : "local";
}
