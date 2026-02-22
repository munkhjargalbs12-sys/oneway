const API_URL = "http://192.168.1.78:3000";

type RegisterPayload = {
  phone: string;
  password: string;
  name: string;
  role: "passenger" | "driver";
  avatar: string;
};
export type User = {
  id: number;
  name: string;
  phone: string;
  role: "passenger" | "driver";
  avatar: string;
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
