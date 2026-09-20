// Where the installed app starts. /login already sends a logged-in visitor
// on to its returnTo, so this one address covers both cases — logged in
// lands on 오늘, logged out sees the login form — without a route of its own
// and without the landing page ever rendering in the app.
export const APP_ENTRY_PATH = "/login?returnTo=/today";
