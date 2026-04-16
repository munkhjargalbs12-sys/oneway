import Constants from "expo-constants";
import * as Updates from "expo-updates";

export type AppUpdateCheckResult =
  | { status: "unavailable"; message: string }
  | { status: "up-to-date"; message: string }
  | { status: "downloaded"; message: string };

export function getAppUpdateMetadata() {
  const appVersion =
    Constants.expoConfig?.version ||
    Constants.nativeAppVersion ||
    "unknown";

  const runtimeVersion =
    typeof Updates.runtimeVersion === "string" && Updates.runtimeVersion.trim()
      ? Updates.runtimeVersion
      : "embedded";

  const channel =
    typeof Updates.channel === "string" && Updates.channel.trim()
      ? Updates.channel
      : "not-set";

  return {
    appVersion,
    runtimeVersion,
    channel,
    isEnabled: Updates.isEnabled,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}

export async function checkAndFetchAppUpdate(): Promise<AppUpdateCheckResult> {
  if (__DEV__) {
    return {
      status: "unavailable",
      message:
        "Dev mode дээр OTA update ажиллахгүй. Release APK эсвэл EAS build дээр туршина уу.",
    };
  }

  if (!Updates.isEnabled) {
    return {
      status: "unavailable",
      message:
        "Энэ build дээр OTA update идэвхжээгүй байна. Шинэ APK build хийхдээ update config-аа хамт оруулна уу.",
    };
  }

  console.log("appUpdate metadata", {
    isEnabled: Updates.isEnabled,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    runtimeVersion: Updates.runtimeVersion,
    channel: Updates.channel,
  });

  const result = await Updates.checkForUpdateAsync();
  console.log("appUpdate check result", result);
  if (!result.isAvailable) {
    return {
      status: "up-to-date",
      message: "Шинэ update алга. Та хамгийн сүүлийн хувилбарыг ашиглаж байна.",
    };
  }

  await Updates.fetchUpdateAsync();
  console.log("appUpdate fetch complete");
  return {
    status: "downloaded",
    message: "Шинэ хувилбар татагдлаа. Апп дахин ачаалж шинэчилнэ.",
  };
}

export async function reloadToApplyUpdate() {
  console.log("appUpdate reload requested");
  await Updates.reloadAsync();
}
