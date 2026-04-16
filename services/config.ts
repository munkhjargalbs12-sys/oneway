import Constants from "expo-constants";
import { Platform } from "react-native";

const normalizeApiUrl = (value?: string | null) =>
  value?.trim()?.replace(/\/+$/, "") || null;

const envApiUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
const runtimeApiUrl =
  typeof Constants.expoConfig?.extra?.apiUrl === "string"
    ? normalizeApiUrl(Constants.expoConfig.extra.apiUrl)
    : null;
const expoGoDebuggerHost =
  typeof (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost === "string"
    ? (Constants.expoGoConfig as { debuggerHost?: string }).debuggerHost
    : null;
const expoHostUri =
  Constants.expoConfig?.hostUri ?? expoGoDebuggerHost ?? null;
const localHost = expoHostUri?.split(":")[0];
const fallbackHost =
  localHost ||
  Platform.select({
    android: "10.0.2.2",
    default: "localhost",
  });

const defaultDevApiUrl = `http://${fallbackHost}:3000`;
const defaultProdApiUrl = runtimeApiUrl || "https://api.oneway.mn";

export const API_URL =
  envApiUrl || (__DEV__ ? defaultDevApiUrl : defaultProdApiUrl);
