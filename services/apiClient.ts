import { getToken } from "./authStorage";

const API_URL = "http://192.168.1.78:3000";

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

  return res.json();
}
