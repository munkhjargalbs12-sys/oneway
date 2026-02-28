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

  return res.json();
}
