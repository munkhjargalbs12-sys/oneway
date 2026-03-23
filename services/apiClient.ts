import { getToken } from "./authStorage";
import { API_URL } from "./config";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const token = await getToken();

  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}
