"use client";

import { useEffect, useState } from "react";
import { Button } from "ui/Button";
import { Toggle } from "ui/Toggle";
import { ServiceNav } from "../components/navigation/ServiceNav";
import {
  SEASON_LABELS,
  SEASONS,
  TIME_OF_DAY_LABELS,
  TIME_OF_DAYS,
  type AmbientMood,
  type Season,
  type TimeOfDay,
} from "../lib/ambient-mood";
import { useAuth } from "../lib/auth/useAuth";
import {
  applyThemePreference,
  loadSiteSettings,
  saveSiteSettings,
  type SiteSettings,
  type ThemePreference,
} from "../lib/site-settings";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
  { value: "system", label: "시스템" },
];

function splitMood(mood: AmbientMood): [Season, TimeOfDay] {
  const [season, timeOfDay] = mood.split("-") as [Season, TimeOfDay];
  return [season, timeOfDay];
}

function joinMood(season: Season, timeOfDay: TimeOfDay): AmbientMood {
  return `${season}-${timeOfDay}`;
}

type SettingsFormProps = {
  settings: SiteSettings;
  onChange(next: SiteSettings): void;
};

function SettingsForm({ settings, onChange }: SettingsFormProps) {
  const [manualSeason, manualTimeOfDay] = splitMood(settings.manualMood);

  function update(patch: Partial<SiteSettings>) {
    const next = { ...settings, ...patch };
    saveSiteSettings(next);
    if (patch.theme) applyThemePreference(patch.theme);
    onChange(next);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">테마</h2>
        <div
          aria-label="테마 선택"
          className="inline-flex rounded-lg border border-line p-0.5"
          role="radiogroup"
        >
          {THEME_OPTIONS.map((option) => (
            <button
              aria-checked={settings.theme === option.value}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                settings.theme === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
              key={option.value}
              role="radio"
              type="button"
              onClick={() => update({ theme: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          404 페이지 배경
        </h2>
        <Toggle
          checked={!settings.disable404Scene}
          label="404 페이지에 계절/시간대 배경 효과 보이기"
          onChange={(checked) => update({ disable404Scene: !checked })}
        />
        {!settings.disable404Scene && (
          <div className="space-y-3 pt-1">
            <Toggle
              checked={settings.ambientMode === "manual"}
              label="계절/시간대를 직접 고르기"
              onChange={(checked) =>
                update({ ambientMode: checked ? "manual" : "auto" })
              }
            />
            {settings.ambientMode === "manual" && (
              <div className="flex flex-wrap gap-3 pl-1">
                <label className="flex flex-col gap-1 text-xs text-muted">
                  계절
                  <select
                    className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-foreground"
                    value={manualSeason}
                    onChange={(event) =>
                      update({
                        manualMood: joinMood(
                          event.target.value as Season,
                          manualTimeOfDay,
                        ),
                      })
                    }
                  >
                    {SEASONS.map((season) => (
                      <option key={season} value={season}>
                        {SEASON_LABELS[season]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  시간대
                  <select
                    className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-foreground"
                    value={manualTimeOfDay}
                    onChange={(event) =>
                      update({
                        manualMood: joinMood(
                          manualSeason,
                          event.target.value as TimeOfDay,
                        ),
                      })
                    }
                  >
                    {TIME_OF_DAYS.map((timeOfDay) => (
                      <option key={timeOfDay} value={timeOfDay}>
                        {TIME_OF_DAY_LABELS[timeOfDay]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">모션</h2>
        <Toggle
          checked={settings.reduceMotion}
          label="애니메이션 줄이기"
          onChange={(checked) => update({ reduceMotion: checked })}
        />
        <p className="text-xs text-muted">
          기기 설정과 별개로 온설 안에서만 애니메이션을 끌 수 있어요.
        </p>
      </section>
    </div>
  );
}

export function SettingsPageContent() {
  const { status } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  // 서버/최초 렌더는 항상 null과 같아야 hydration이 어긋나지 않으므로,
  // 실제 저장된 값은 마운트 후에만 읽는다 — settings가 null인 동안은 아무
  // 폼도 그리지 않아 "기본값이 잠깐 보였다가 실제 값으로 바뀌는" 깜빡임도 없다.
  // setState를 effect 본문에서 바로 부르면 react-hooks/set-state-in-effect에
  // 걸려서 useMinDisplayDuration과 같은 방식으로 setTimeout(…, 0)에 미룬다.
  useEffect(() => {
    const timer = window.setTimeout(() => setSettings(loadSiteSettings()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/settings" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        <section className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            설정
          </h1>
        </section>
        {status === "authenticated" ? (
          settings && <SettingsForm settings={settings} onChange={setSettings} />
        ) : (
          <section className="space-y-3">
            <p className="max-w-xl leading-7 text-muted">
              로그인하면 설정을 바꿀 수 있습니다.
            </p>
            <Button href="/login">로그인</Button>
          </section>
        )}
      </main>
    </div>
  );
}
