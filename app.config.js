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
const notificationSoundFiles = ["./assets/sounds/horn.wav"];

const hasPlugin = (name) =>
  plugins.some((plugin) =>
    Array.isArray(plugin) ? plugin[0] === name : plugin === name
  );

const upsertPluginOptions = (name, options) => {
  const index = plugins.findIndex((plugin) =>
    Array.isArray(plugin) ? plugin[0] === name : plugin === name
  );

  if (index === -1) {
    plugins.push([name, options]);
    return;
  }

  const existing = plugins[index];
  const existingOptions =
    Array.isArray(existing) && existing[1] && typeof existing[1] === "object"
      ? existing[1]
      : {};
  const existingSounds = Array.isArray(existingOptions.sounds)
    ? existingOptions.sounds
    : [];
  const nextSounds = Array.isArray(options.sounds) ? options.sounds : [];

  const nextOptions = {
    ...existingOptions,
    ...options,
    sounds: Array.from(new Set([...existingSounds, ...nextSounds])),
  };

  plugins[index] = [name, nextOptions];
};

if (!hasPlugin("expo-updates")) {
  plugins.push("expo-updates");
}

if (!hasPlugin("expo-audio")) {
  plugins.push("expo-audio");
}

upsertPluginOptions("expo-notifications", {
  sounds: notificationSoundFiles,
});

module.exports = {
  expo: {
    ...baseExpoConfig,
    android: {
      ...baseExpoConfig.android,
      package: "com.anonymous.oneway",
      googleServicesFile: "./google-services.json",
    },
    plugins,
    runtimeVersion:
      process.env.EXPO_RUNTIME_VERSION ||
      baseExpoConfig.runtimeVersion ||
      baseExpoConfig.version ||
      "1.0.0",
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
