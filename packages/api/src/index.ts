// Shared between apps/web and apps/admin — see
// docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md. Each
// consuming app supplies its own NEXT_PUBLIC_API_BASE_URL; Next.js inlines
// it per-app at build time via transpilePackages, so this one module
// resolves to a different value in each app without any parameterization.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

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
  // nicknameDiscriminator is always present even when nickname is null —
  // see apps/api-server/src/users/nickname-discriminator.ts.
  nickname: string | null;
  nicknameDiscriminator: string;
  // null until the nickname has been changed at least once (a first-time
  // set is always free). Otherwise the ISO timestamp the *next* change
  // becomes allowed — may be in the past, meaning the cooldown already
  // elapsed. See apps/api-server's UsersService.updateNickname.
  nicknameChangeAvailableAt: string | null;
  // Independent public-profile (/u/[slug]) visibility switches — apps/web
  // only concern for now (apps/admin doesn't surface these), but the
  // response shape is shared. See apps/api-server's users.schema.ts.
  showRequestsOnProfile: boolean;
  showRepliesOnProfile: boolean;
  showCountsOnProfile: boolean;
  // Whether the nickname is shown to anyone but the owner — a pure
  // visibility switch, not the same as clearing/changing it. Never affects
  // nickname/nicknameChangeAvailableAt above.
  nicknameVisible: boolean;
};

// Present in both apps as-is. Signup and Google OAuth are apps/web-only
// (apps/admin has no signup, no OAuth) and stay defined there.
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
