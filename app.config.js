const appJson = require("./app.json");

const baseExpoConfig = appJson.expo || {};
const configuredProjectId =
  process.env.EAS_PROJECT_ID ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  baseExpoConfig.extra?.eas?.projectId ||
  null;
const configuredChannel =
  process.env.EXPO_UPDATES_CHANNEL ||
  process.env.EAS_UPDATE_CHANNEL ||
  "production";

const plugins = Array.isArray(baseExpoConfig.plugins)
  ? [...baseExpoConfig.plugins]
  : [];

const hasPlugin = (name) =>
  plugins.some((plugin) =>
    Array.isArray(plugin) ? plugin[0] === name : plugin === name
  );

if (!hasPlugin("expo-updates")) {
  plugins.push("expo-updates");
}

if (!hasPlugin("expo-audio")) {
  plugins.push("expo-audio");
}

if (!hasPlugin("expo-notifications")) {
  plugins.push("expo-notifications");
}

module.exports = {
  expo: {
    ...baseExpoConfig,
    plugins,
    runtimeVersion: process.env.EXPO_RUNTIME_VERSION || baseExpoConfig.version || "1.0.0",
    updates: {
      enabled: Boolean(configuredProjectId),
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
      requestHeaders: {
        "expo-channel-name": configuredChannel,
      },
      ...(configuredProjectId
        ? { url: `https://u.expo.dev/${configuredProjectId}` }
        : {}),
    },
    extra: {
      ...baseExpoConfig.extra,
      ...(configuredProjectId
        ? {
            eas: {
              ...(baseExpoConfig.extra?.eas || {}),
              projectId: configuredProjectId,
            },
          }
        : {}),
    },
  },
};
