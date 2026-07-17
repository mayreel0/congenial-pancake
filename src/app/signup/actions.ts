"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { createAccount } from "@/server/signup";

function signupErrorPath(error: unknown): string {
  if (!(error instanceof Error)) return "/signup?error=unknown";
  if (error.message === "EMAIL_ALREADY_REGISTERED") return "/signup?error=email";
  if (error.message === "NICKNAME_ALREADY_REGISTERED") return "/signup?error=nickname";
  if (
    error.message === "INVALID_EMAIL" ||
    error.message === "NICKNAME_TOO_SHORT" ||
    error.message === "NICKNAME_TOO_LONG" ||
    error.message === "PASSWORD_TOO_SHORT" ||
    error.message === "PASSWORD_TOO_LONG"
  ) {
    return "/signup?error=invalid";
  }
  return "/signup?error=unknown";
}

export async function signupWithCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await createAccount({
      email,
      nickname: String(formData.get("nickname") ?? ""),
      password
    });
    await signIn("credentials", {
      email,
      password,
      redirect: false
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=credentials");
    }
    redirect(signupErrorPath(error));
  }

  redirect("/");
}
