function normalizeText(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

export function getNotificationType(item: any) {
  return normalizeText(item?.type);
}

export function getNotificationBookingStatus(item: any) {
  return normalizeText(item?.booking_status ?? item?.status);
}

export function getNotificationAttendanceStatus(item: any) {
  return normalizeText(item?.attendance_status ?? item?.attendanceStatus);
}

export function getNotificationBookingId(item: any): number | null {
  const raw =
    item?.booking_id ??
    item?.bookingId ??
    item?.booking?.id ??
    item?.data?.booking_id ??
    item?.data?.bookingId ??
    null;

  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function getNotificationRequesterName(item: any) {
  const directName =
    item?.from_user_name ||
    item?.from_name ||
    item?.fromUserName ||
    item?.requester?.name ||
    item?.requester?.full_name ||
    item?.requester_name ||
    item?.user_name ||
    item?.full_name ||
    item?.name ||
    item?.from_user?.name ||
    item?.from_user?.full_name;

  const normalizedDirectName = normalizeText(directName);
  if (normalizedDirectName && !["хэрэглэгч", "хэрэлэгч", "user"].includes(normalizedDirectName)) {
    return String(directName).trim();
  }

  const bodyText = String(item?.body || "");
  const bodyMatch =
    bodyText.match(/^(.+?)\s+хэрэглэгч/i) ||
    bodyText.match(/^Зорчигч\s+(.+?)\s+/i) ||
    bodyText.match(/^(.+?)\s+таны\s+үүсгэсэн/i);

  if (bodyMatch?.[1]) {
    return String(bodyMatch[1]).trim();
  }

  return "Хэрэглэгч";
}

export function isDriverBookingRequestNotification(item: any) {
  const bookingId = getNotificationBookingId(item);
  if (!bookingId) return false;

  const type = getNotificationType(item);
  if (type === "booking_approved" || type === "booking_rejected") {
    return false;
  }

  if (!type || type === "booking" || type === "booking_request" || type === "seat_request") {
    return true;
  }

  const title = normalizeText(item?.title);
  const body = normalizeText(item?.body);

  return (
    title.includes("суудлын захиалга") ||
    title.includes("захиалга") ||
    body.includes("хүсэлт илгээсэн") ||
    body.includes("хамт зорчих хүсэлт")
  );
}

export function canReviewDriverRequestNotification(item: any) {
  if (!isDriverBookingRequestNotification(item)) return false;

  const bookingStatus = getNotificationBookingStatus(item);
  return bookingStatus === "pending";
}

export function countUnreadNotifications(list: any[]) {
  return Array.isArray(list) ? list.filter((item) => !item?.is_read).length : 0;
}

export function sortNotificationsNewestFirst(list: any[]) {
  if (!Array.isArray(list)) return [];

  return [...list].sort(
    (a: any, b: any) =>
      new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
  );
}
