"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { completeSignupSchema } from "shared/dto";
import { errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth/useAuth";
import { useFieldValidation } from "ui/useFieldValidation";
import { SUBMIT_SPINNER_DELAY_MS, useDelayedPending } from "ui/useDelayedPending";
import { parseFieldErrors } from "shared/zod-form";
import { VerifyEmailBody, type VerifyEmailStatus } from "./VerifyEmailBody";

type Field = "password";

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { completeSignup } = useAuth();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<VerifyEmailStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { touchAll, visibleError } = useFieldValidation<Field>();
  const fieldErrors = parseFieldErrors(completeSignupSchema, {
    token: token ?? "",
    password,
  });
  // Delayed so a fast signup doesn't flash the spinner — the submit
  // button's own disabled state still gates on the raw status.
  const showSpinner = useDelayedPending(
    status === "pending",
    SUBMIT_SPINNER_DELAY_MS,
  );

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!token) return;
    touchAll(["password"]);
    if (Object.keys(fieldErrors).length > 0) return;

    setError(null);
    setStatus("pending");
    try {
      await completeSignup(token, password);
      // The token just proved this person owns the account — no reason to
      // make them turn around and log in with what they just typed.
      router.push("/today");
    } catch (submitError) {
      setError(errorMessage(submitError));
      setStatus("idle");
    }
  }

  return (
    <main className="flex min-h-dvh items-center bg-background px-5 py-10 text-foreground sm:px-8">
      <section className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            이메일 인증
          </h1>
        </div>

        <VerifyEmailBody
          error={error}
          fieldError={visibleError("password", fieldErrors)}
          hasFieldErrors={Object.keys(fieldErrors).length > 0}
          password={password}
          showSpinner={showSpinner}
          status={status}
          token={token}
          onPasswordChange={setPassword}
          onSubmit={(event) => void handleSubmit(event)}
        />
      </section>
    </main>
  );
}
