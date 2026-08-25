"use client";

import { useState, type FormEvent } from "react";
import { AdminNav } from "../components/AdminNav";
import { LoginForm } from "../components/LoginForm";
import { useAuth } from "../lib/auth/useAuth";
import type { AdminSettingsDto } from "../lib/admin/settings-api";
import { useAdminSettings } from "./useAdminSettings";

type FormState = {
  queueFreshnessHours: string;
  queueReplyCap: string;
  guestReplyLimit: string;
};

const FIELDS: Array<{
  key: keyof FormState;
  label: string;
  hint: string;
  min: number;
  max: number;
}> = [
  {
    key: "queueFreshnessHours",
    label: "답변 큐 신선도 (시간)",
    hint: "이 시간이 지난 온설은 답변 큐/보관함에서 제외됩니다.",
    min: 1,
    max: 720,
  },
  {
    key: "queueReplyCap",
    label: "답변 큐 답장 캡",
    hint: "이 개수 이상 답장이 달린 온설은 우선순위가 낮아집니다.",
    min: 1,
    max: 50,
  },
  {
    key: "guestReplyLimit",
    label: "비회원 답장 총량 제한",
    hint: "비회원 한 명이 전체 온설을 통틀어 남길 수 있는 답장 개수입니다.",
    min: 1,
    max: 50,
  },
];

function toFormState(settings: AdminSettingsDto): FormState {
  return {
    queueFreshnessHours: String(settings.queueFreshnessHours),
    queueReplyCap: String(settings.queueReplyCap),
    guestReplyLimit: String(settings.guestReplyLimit),
  };
}

type SettingsFormProps = {
  settings: AdminSettingsDto;
  updating: boolean;
  updateError: string | null;
  update: ReturnType<typeof useAdminSettings>["update"];
};

// Only mounted once settings has actually loaded (see the parent below),
// and never remounted after that (same element position/type on every
// re-render, so React preserves this component's identity even as the
// `settings` prop's object reference changes on refetch) — so the lazy
// useState initializer below runs exactly once, seeding local form state
// from the first server value without an effect-based sync. This also
// means a background refetch never clobbers an in-progress edit; update()
// is the only thing that pushes local changes back to the server.
function SettingsForm({
  settings,
  updating,
  updateError,
  update,
}: SettingsFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(settings));
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaved(false);

    await update({
      queueFreshnessHours: Number(form.queueFreshnessHours),
      queueReplyCap: Number(form.queueReplyCap),
      guestReplyLimit: Number(form.guestReplyLimit),
    });
    setSaved(true);
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-foreground">설정</h1>
      <form
        className="space-y-6"
        onSubmit={(event) => void handleSubmit(event)}
      >
        {FIELDS.map((field) => (
          <div className="space-y-1" key={field.key}>
            <label
              className="text-sm font-semibold text-foreground"
              htmlFor={field.key}
            >
              {field.label}
            </label>
            <p className="text-xs text-muted">{field.hint}</p>
            <input
              className="w-40 rounded-lg border border-line bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-primary"
              id={field.key}
              max={field.max}
              min={field.min}
              required
              type="number"
              value={form[field.key]}
              onChange={(event) => {
                setSaved(false);
                setForm({ ...form, [field.key]: event.currentTarget.value });
              }}
            />
          </div>
        ))}

        {updateError ? (
          <p className="text-sm text-red-600">{updateError}</p>
        ) : saved ? (
          <p className="text-sm text-primary">저장했어요.</p>
        ) : null}

        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={updating}
          type="submit"
        >
          {updating ? "저장 중" : "저장"}
        </button>
      </form>
    </>
  );
}

export function SettingsReview() {
  const auth = useAuth();
  const admin = useAdminSettings();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AdminNav activePath="/settings" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        {admin.status === "loading" ? null : admin.status === "signedOut" ? (
          <LoginForm login={auth.login} />
        ) : admin.status === "forbidden" ? (
          <p className="py-16 text-center text-sm text-muted">
            이 계정은 접근 권한이 없어요.
          </p>
        ) : !admin.settings ? null : (
          <SettingsForm
            settings={admin.settings}
            updating={admin.updating}
            updateError={admin.updateError}
            update={admin.update}
          />
        )}
      </main>
    </div>
  );
}
