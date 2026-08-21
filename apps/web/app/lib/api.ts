const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const { code, message } = (body ?? {}) as { code?: string; message?: string };
    throw new ApiError(
      response.status,
      code ?? "UNKNOWN_ERROR",
      message ?? "요청을 처리하지 못했습니다.",
    );
  }

  return body as T;
}

export type CurrentUser = {
  id: string;
  email: string;
  createdAt: string;
};

export function signup(email: string, password: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export function fetchCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/me");
}

export function googleLoginUrl(): string {
  return `${API_BASE_URL}/auth/google`;
}
