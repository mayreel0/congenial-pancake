import type {
  NotificationResponseDto,
  UnreadCountResponseDto,
} from "shared/dto";
import { apiFetch } from "../api";
import type { PaginatedDto } from "../pagination";

export type NotificationDto = NotificationResponseDto;

export function fetchUnreadCount(): Promise<UnreadCountResponseDto> {
  return apiFetch<UnreadCountResponseDto>("/notifications/unread-count");
}

export function fetchNotifications(
  page?: number,
  pageSize?: number,
): Promise<PaginatedDto<NotificationDto>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return apiFetch<PaginatedDto<NotificationDto>>(
    `/notifications${query ? `?${query}` : ""}`,
  );
}

export function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>("/notifications/read", { method: "POST" });
}

export function deleteNotification(id: string): Promise<void> {
  return apiFetch<void>(`/notifications/${id}`, { method: "DELETE" });
}

export function deleteAllNotifications(): Promise<void> {
  return apiFetch<void>("/notifications", { method: "DELETE" });
}
