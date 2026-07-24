"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireUser } from "@/server/permissions";
import { updateRequiredNickname } from "@/server/signup";

function nicknameErrorPath(error: unknown): string {
  if (!(error instanceof Error)) return "/onboarding/nickname?error=unknown";
  if (error.message === "NICKNAME_ALREADY_REGISTERED") return "/onboarding/nickname?error=nickname";
  if (error.message === "NICKNAME_TOO_SHORT" || error.message === "NICKNAME_TOO_LONG") {
    return "/onboarding/nickname?error=invalid";
  }
  return "/onboarding/nickname?error=unknown";
}

export async function saveNickname(formData: FormData) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const useNaverName = formData.has("useNaverName");
  const nickname = String(formData.get(useNaverName ? "providerName" : "nickname") ?? "");

  try {
    await updateRequiredNickname(userId, nickname);
  } catch (error) {
    redirect(nicknameErrorPath(error));
  }

  redirect("/");
}
