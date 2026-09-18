"use client";

import { useMutation } from "@tanstack/react-query";
import type { SendTestPushDto } from "shared/dto";
import { sendTestPush } from "./push-test-api";

export function useSendTestPushMutation() {
  return useMutation({
    mutationFn: (dto: SendTestPushDto) => sendTestPush(dto),
  });
}
