import type {
  AdminContentStatus,
  AdminReplyListItemDto,
  AdminRequestListItemDto,
  ReplyModerationActionDto,
} from "shared/dto";
import type { PaginatedDto } from "shared/pagination";
import { apiFetch } from "../api";

export type AdminRequestListFilters = {
  q?: string;
  from?: string;
  to?: string;
  status?: AdminContentStatus;
  page?: number;
  pageSize?: number;
};

function toSearchParams(filters: AdminRequestListFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  return params.toString();
}

export function fetchAdminRequests(
  filters: AdminRequestListFilters,
): Promise<PaginatedDto<AdminRequestListItemDto>> {
  const query = toSearchParams(filters);
  return apiFetch<PaginatedDto<AdminRequestListItemDto>>(
    `/admin/requests${query ? `?${query}` : ""}`,
  );
}

export type AdminReplyListFilters = AdminRequestListFilters & {
  action?: ReplyModerationActionDto;
};

export function fetchAdminReplies(
  filters: AdminReplyListFilters,
): Promise<PaginatedDto<AdminReplyListItemDto>> {
  const params = new URLSearchParams(toSearchParams(filters));
  if (filters.action) params.set("action", filters.action);
  const query = params.toString();
  return apiFetch<PaginatedDto<AdminReplyListItemDto>>(
    `/admin/replies${query ? `?${query}` : ""}`,
  );
}
