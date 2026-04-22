export function getBookingStatusLabel(status?: string | null) {
  switch (String(status ?? "").toLowerCase()) {
    case "pending":
      return "Жолоочийн зөвшөөрөл хүлээж байна";
    case "approved":
      return "Захиалга баталгаажсан";
    case "rejected":
      return "Жолооч зөвшөөрөөгүй";
    case "cancelled":
    case "canceled":
      return "Захиалга цуцлагдсан";
    default:
      return "Суудал захиалсан";
  }
}

export function getBookingStatusColor(status?: string | null) {
  switch (String(status ?? "").toLowerCase()) {
    case "pending":
      return "#d97706";
    case "approved":
      return "#16a34a";
    case "rejected":
      return "#dc2626";
    case "cancelled":
    case "canceled":
      return "#9f1239";
    default:
      return "#16a34a";
  }
}

function toRideId(value: unknown) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

export function getBookingEntries(payload: any) {
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

export function extractBookedRideIds(payload: any): number[] {
  const preferred =
    (Array.isArray(payload?.ride_ids) && payload.ride_ids) ||
    getBookingEntries(payload);

  const ids = preferred
    .map((entry: any) => toRideId(entry?.ride_id ?? entry?.ride?.id ?? entry?.id ?? entry))
    .filter((id: number | null): id is number => id !== null);

  return Array.from(new Set(ids));
}

export function extractBookingStatusByRide(payload: any) {
  const byRide: Record<number, string> = {};

  if (payload?.status_by_ride && typeof payload.status_by_ride === "object") {
    for (const [rideId, status] of Object.entries(payload.status_by_ride)) {
      const id = toRideId(rideId);
      if (id === null) continue;
      byRide[id] = String(status ?? "");
    }
  }

  for (const entry of getBookingEntries(payload)) {
    const rideId = toRideId(entry?.ride_id ?? entry?.ride?.id ?? entry?.id);
    if (rideId === null) continue;
    if (typeof entry?.status === "string" && entry.status.trim()) {
      byRide[rideId] = entry.status;
    }
  }

  return byRide;
}

export function extractBookingStatusLabelByRide(payload: any) {
  const byRide: Record<number, string> = {};

  if (payload?.status_label_by_ride && typeof payload.status_label_by_ride === "object") {
    for (const [rideId, label] of Object.entries(payload.status_label_by_ride)) {
      const id = toRideId(rideId);
      if (id === null) continue;
      byRide[id] = String(label ?? "");
    }
  }

  for (const entry of getBookingEntries(payload)) {
    const rideId = toRideId(entry?.ride_id ?? entry?.ride?.id ?? entry?.id);
    if (rideId === null) continue;

    if (typeof entry?.status_label === "string" && entry.status_label.trim()) {
      byRide[rideId] = entry.status_label;
      continue;
    }

    if (!byRide[rideId]) {
      byRide[rideId] = getBookingStatusLabel(entry?.status);
    }
  }

  return byRide;
}

export function extractBookingIdByRide(payload: any) {
  const byRide: Record<number, number> = {};

  for (const entry of getBookingEntries(payload)) {
    const rideId = toRideId(entry?.ride_id ?? entry?.ride?.id ?? entry?.id);
    const bookingId = toRideId(entry?.booking_id ?? entry?.booking?.id ?? entry?.id);
    if (rideId === null || bookingId === null) continue;
    byRide[rideId] = bookingId;
  }

  return byRide;
}
