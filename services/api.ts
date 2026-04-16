import { API_URL } from "./config";
import { buildNetworkErrorMessage } from "./networkDiagnostics";

type RegisterPayload = {
  phone: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: "passenger" | "driver";
  avatar_id: string;
};

export type User = {
  id: number;
  name: string;
  phone: string;
  role: "passenger" | "driver";
  avatar_id: string;
  rating: number;
  trust_level?: number;
  balance?: number;
  locked_balance?: number;
  email?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  identity_verified?: boolean;
  driver_license_verified?: boolean;
  verification_status?: string;
  verification_submitted_at?: string | null;
  verification_approved_at?: string | null;
  verification_rejected_at?: string | null;
  verification_note?: string | null;
  payment_account?: string;
  payment_linked?: boolean;
  driver_license_number?: string;
  driver_verified?: boolean;
  vehicle_verified?: boolean;
};

export type AuthResponse = {
  token?: string;
  user?: User;
  message?: string;
};

async function handleResponse(res: Response): Promise<AuthResponse> {
  const text = await res.text().catch(() => "");
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    return {
      message:
        data.message ||
        data.error ||
        `Request failed (${res.status}) at ${res.url || "unknown URL"}`,
    };
  }

  return data;
}

export async function register(data: RegisterPayload): Promise<AuthResponse> {
  const url = `${API_URL}/auth/register`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse(res);
  } catch (err) {
    return { message: buildNetworkErrorMessage("Register request", url, err) };
  }
}

export async function login(phone: string, password: string): Promise<AuthResponse> {
  const url = `${API_URL}/auth/login`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    return handleResponse(res);
  } catch (err) {
    return { message: buildNetworkErrorMessage("Login request", url, err) };
  }
}

export async function updateAvatar(avatar_id: string, token: string) {
  const url = `${API_URL}/users/avatar`;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ avatar_id, confirm: true }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        message:
          data.message ||
          data.error ||
          `Request failed (${res.status}) at ${url}`,
      };
    }

    return data;
  } catch (err) {
    return { message: buildNetworkErrorMessage("Avatar update request", url, err) };
  }
}
