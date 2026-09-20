// Installed-app launch (home screen / desktop app window), as opposed to a
// browser tab. Push is only meant to be turned on from the installed app;
// iOS reports it through the non-standard navigator.standalone rather than
// the display-mode media query.
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayModeStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayModeStandalone;
}
