"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestKeys } from "../requests/queries";
import { createReport, type ReportTargetType } from "./api";

export function useCreateReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetType,
      targetId,
    }: {
      targetType: ReportTargetType;
      targetId: string;
    }) => createReport(targetType, targetId),
    onSuccess: (_, variables) => {
      // A reported request/reply may auto-hide (3 distinct reporters) —
      // refresh the feed either way, and the queue only for a reported
      // request (a hidden request shouldn't linger as the current target).
      void queryClient.invalidateQueries({ queryKey: requestKeys.feed });
      if (variables.targetType === "request") {
        void queryClient.invalidateQueries({ queryKey: requestKeys.queue });
      }
    },
  });
}
