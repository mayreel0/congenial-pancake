import { apiFetch } from "../api";

export function fetchAdminWhoami(): Promise<{ isAdmin: true }> {
  return apiFetch<{ isAdmin: true }>("/admin/whoami");
}
