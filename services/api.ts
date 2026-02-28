import { API_URL } from "./config";

type RegisterPayload = {
  phone: string;
  password: string;
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
};
export type AuthResponse = {
  token?: string;
  user?: User;   
  message?: string;
};

async function handleResponse(res: Response): Promise<AuthResponse> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { message: data.message || "Серверийн алдаа гарлаа" };
  }

  return data;
}

export async function register(data: RegisterPayload): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse(res);
  } catch {
    return { message: "Сервертэй холбогдож чадсангүй" };
  }
}

export async function login(phone: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    return handleResponse(res);
  } catch {
    return { message: "Сервертэй холбогдож чадсангүй" };
  }
}

export async function updateAvatar(avatar_id: string, token: string) {
  try {
    const res = await fetch(`${API_URL}/users/avatar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ avatar_id }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { message: data.message || "Failed to update avatar" };
    return data;
  } catch (err) {
    return { message: "Сервертэй холбогдож чадсангүй" };
  }
}
