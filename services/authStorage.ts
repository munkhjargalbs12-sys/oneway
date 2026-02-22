import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";


const TOKEN_KEY = "oneway_token";
const GUEST_KEY = "oneway_guest";
const USER_KEY = "oneway_user"; // ⭐ НЭМЭГДСЭН

/* ================= TOKEN ================= */

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.removeItem(GUEST_KEY); // guest mode унтарна
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/* ================= USER ================= */

export async function saveUser(user: any) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser() {
  const data = await SecureStore.getItemAsync(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function removeUser() {
  await SecureStore.deleteItemAsync(USER_KEY);
}

/* ================= GUEST MODE ================= */

export async function setGuestMode() {
  await AsyncStorage.setItem(GUEST_KEY, "true");
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY); // ⭐ guest үед user байхгүй
}

export async function isGuestMode() {
  const val = await AsyncStorage.getItem(GUEST_KEY);
  return val === "true";
}

/* ================= CLEAR AUTH ================= */

export async function clearAuth() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY); // ⭐ user мөн устгана
  await AsyncStorage.removeItem(GUEST_KEY);
}

const REMEMBER_KEY = "oneway_remember";

export async function saveRemembered(phone: string, password: string) {
  await AsyncStorage.setItem(
    REMEMBER_KEY,
    JSON.stringify({ phone, password })
  );
}

export async function getRemembered() {
  const data = await AsyncStorage.getItem(REMEMBER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearRemembered() {
  await AsyncStorage.removeItem(REMEMBER_KEY);
}