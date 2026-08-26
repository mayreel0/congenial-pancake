"use client";

import { useMutation } from "@tanstack/react-query";
import { issuePasswordResetLink } from "./accounts-api";

export function useIssuePasswordResetLinkMutation() {
  return useMutation({
    mutationFn: (email: string) => issuePasswordResetLink(email),
  });
}
