import { formatRideDate } from "./rideDate";

const COMPLETED_RIDE_STATUSES = new Set(["completed", "cancelled", "canceled"]);

function buildLocalDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocalDayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function normalizeTime(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "00:00:00";
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
}

export function getRideStartDate(ride: any) {
  const rideDate = formatRideDate(ride?.ride_date, "");
  if (!rideDate) return null;

  const date = new Date(`${rideDate}T${normalizeTime(ride?.start_time)}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isRidePast(ride: any, now = new Date()) {
  const startDate = getRideStartDate(ride);
  if (!startDate) return false;
  return startDate.getTime() < now.getTime();
}

export function isRideBeforeToday(ride: any, now = new Date()) {
  const rideDate = formatRideDate(ride?.ride_date, "");
  if (!rideDate) return false;

  const rideDay = buildLocalDate(rideDate);
  if (!rideDay) return false;

  return rideDay.getTime() < getLocalDayStart(now).getTime();
}

export function shouldShowRideOnHome(ride: any, now = new Date()) {
  if (!ride) {
    return false;
  }

  const status = String(ride?.status ?? "").trim().toLowerCase();

  if (COMPLETED_RIDE_STATUSES.has(status)) {
    return false;
  }

  if (status === "started") {
    return true;
  }

  return !isRideBeforeToday(ride, now);
}
