export const INSTALL_PROMPT_EVENT = "onseol:installprompt";
export const APP_INSTALLED_KEY = "onseol.appInstalled";

// Runs as a plain <script> from the root layout, before any bundle loads.
// `beforeinstallprompt` fires once per document load — a listener added by a
// component only after hydration, or on a page reached by client-side
// navigation after it already fired, never sees it. So this stashes the event
// on window for whoever needs it later.
//
// Also keeps an "installed" flag: set on `appinstalled` and whenever the site
// is running as the installed app, cleared whenever the browser offers the
// install prompt (which it only does while not installed) — so uninstalling
// doesn't leave the install button hidden forever. Chromium shares
// localStorage between the browser and the installed app; iOS doesn't, which
// only means the flag never reaches Safari there.
export const INSTALL_PROMPT_SCRIPT = `
(function () {
  function setInstalled(value) {
    try {
      if (value) localStorage.setItem("${APP_INSTALLED_KEY}", "1");
      else localStorage.removeItem("${APP_INSTALLED_KEY}");
    } catch (e) {}
  }
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
  } catch (e) {}
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__onseolInstallPrompt = event;
    setInstalled(false);
    window.dispatchEvent(new Event("${INSTALL_PROMPT_EVENT}"));
  });
  window.addEventListener("appinstalled", function () {
    window.__onseolInstallPrompt = null;
    setInstalled(true);
    window.dispatchEvent(new Event("${INSTALL_PROMPT_EVENT}"));
  });
})();
`;
