"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";

export async function loginWithCredentials(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=credentials");
    }
    throw error;
  }

  redirect("/");
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
