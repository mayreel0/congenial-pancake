import type { AmbientMood } from "./ambient-mood";

// 로그인 여부와 무관하게 브라우저(localStorage)에만 저장 — 계정/기기 간
// 동기화는 하지 않는다(/settings 백로그 논의에서 확정, 서버 왕복 없이
// 즉시 적용되는 취향 설정이라 계정 저장의 복잡도가 어울리지 않는다고 판단).
const STORAGE_KEY = "onseol:site-settings";

export type ThemePreference = "light" | "dark" | "system";
type AmbientModePreference = "auto" | "manual";

export type SiteSettings = {
  theme: ThemePreference;
  ambientMode: AmbientModePreference;
  // ambientMode가 "manual"일 때만 쓰인다.
  manualMood: AmbientMood;
  reduceMotion: boolean;
  disable404Scene: boolean;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  theme: "system",
  ambientMode: "auto",
  manualMood: "spring-morning",
  reduceMotion: false,
  disable404Scene: false,
};

export function loadSiteSettings(): SiteSettings {
  if (typeof window === "undefined") return DEFAULT_SITE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function saveSiteSettings(settings: SiteSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 프라이빗 모드 등으로 localStorage를 못 쓰는 경우 — 조용히 무시,
    // 이번 세션 동안은 메모리 상태로만 동작.
  }
}

// "system"이면 data-theme을 아예 지워서 globals.css의 prefers-color-scheme
// 분기가 그대로 적용되게 하고, "light"/"dark"면 이미 globals.css에 있던
// (지금까지 Storybook 테마 툴바 전용이었던) [data-theme] 오버라이드 토큰을
// 그대로 재사용한다.
export function applyThemePreference(theme: ThemePreference): void {
  if (typeof document === "undefined") return;
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}
