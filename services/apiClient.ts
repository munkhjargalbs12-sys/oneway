import { getToken } from "./authStorage";
import { API_URL } from "./config";
import { buildNetworkErrorMessage } from "./networkDiagnostics";

const DEFAULT_TIMEOUT_MS = 15000;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const url = `${API_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;

  try {
    res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (err) {
    const method = String(options.method || "GET").toUpperCase();
    throw new Error(buildNetworkErrorMessage(`${method} ${path}`, url, err));
  } finally {
    clearTimeout(timeout);
  }

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
      `Request failed (${res.status}) at ${url}`;
    throw new Error(message);
  }

  return data;
}
