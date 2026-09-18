import type { SendTestPushDto, SendTestPushResponseDto } from "shared/dto";
import { apiFetch } from "../api";

export function sendTestPush(
  dto: SendTestPushDto,
): Promise<SendTestPushResponseDto> {
  return apiFetch<SendTestPushResponseDto>("/admin/notifications/test", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
