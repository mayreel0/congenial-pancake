// Installed-app launch (home screen / desktop app window), as opposed to a
// browser tab. Push is only meant to be turned on from the installed app.
//
// Decided by the display-mode media query alone. iOS also exposes the
// non-standard navigator.standalone, but it reads true in a plain Safari tab
// too (seen on the iOS 18.2 simulator, address bar showing) — trusting it
// made the site behave like the installed app in Safari. It's only a
// fallback for a browser with no matchMedia at all.
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(display-mode: standalone)").matches;
  }
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
