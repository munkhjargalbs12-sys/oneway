import { Alert } from "react-native";

export type LocationUsageReminderReason = "create" | "search";

function getReminderBody(reason: LocationUsageReminderReason | string | null | undefined) {
  if (reason === "create") {
    return "Чиглэлээ үүсгэчихлээ. Одоо утасныхаа байршлыг унтрааж болно. Дараа нь шинэ чиглэл үүсгэх эсвэл хайлт хийх үедээ дахин асаахад хангалттай.";
  }

  return "Чиглэлээ хайж дууслаа. Одоо утасныхаа байршлыг унтрааж болно. Дараа нь дахин хайлт хийх үедээ асаахад хангалттай.";
}

export function showLocationUsageReminder(
  reason: LocationUsageReminderReason | string | null | undefined,
  onClose?: () => void
) {
  Alert.alert("Байршлаа унтрааж болно", getReminderBody(reason), [
    {
      text: "Ойлголоо",
      onPress: onClose,
    },
  ]);
}
