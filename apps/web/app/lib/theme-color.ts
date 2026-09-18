// The dark theme's --background (apps/web/app/globals.css) — used
// wherever a hex value is needed outside CSS (layout.tsx's viewport
// themeColor, manifest.ts's background_color/theme_color). This is the
// app's default regardless of a viewer's /settings choice, since a
// freshly-installed PWA's splash screen or the browser chrome color has
// no per-user preference to read yet.
export const DEFAULT_THEME_COLOR = "#171411";
