import type {
  AdminReplyResponseDto,
  AdminRequestResponseDto,
} from "shared/dto";
import { apiFetch } from "../api";

export type AdminRequestDto = AdminRequestResponseDto;

export type AdminReplyDto = AdminReplyResponseDto;

export type HiddenModerationQueueDto = {
  requests: AdminRequestDto[];
  replies: AdminReplyDto[];
};

export function fetchHiddenModerationQueue(): Promise<HiddenModerationQueueDto> {
  return apiFetch<HiddenModerationQueueDto>("/admin/moderation/hidden");
}

export function restoreRequest(id: string): Promise<void> {
  return apiFetch<void>(`/admin/requests/${id}/restore`, { method: "POST" });
}

export function deleteRequest(id: string): Promise<void> {
  return apiFetch<void>(`/admin/requests/${id}/delete`, { method: "POST" });
}

export function restoreReply(id: string): Promise<void> {
  return apiFetch<void>(`/admin/replies/${id}/restore`, { method: "POST" });
}

export function deleteReply(id: string): Promise<void> {
  return apiFetch<void>(`/admin/replies/${id}/delete`, { method: "POST" });
}
