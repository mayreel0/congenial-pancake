import { apiFetch } from "../api";

export function issuePasswordResetLink(email: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/admin/users/password-reset-link", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
