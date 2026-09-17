// Shared by TextField/HeatmapCalendarField/Select — a filter row's fields
// only look good stacked-full-width (mobile) or fully-in-one-row (once
// every field fits). Any width in between where flex-wrap partially wraps
// looks broken: whichever field lands alone on the last line renders at
// its own small fixed/content width instead of stretching, so it reads
// as a stray, undersized orphan next to the full-width fields above it.
//
// This is a *container* query breakpoint (Tailwind v4's `@min-[Npx]:`),
// not a viewport one (`sm:`/`md:`/`lg:`) — a viewport breakpoint can't
// tell the row's actual available width apart from the browser window's
// width, and those two differ in this app: apps/admin's AdminShell has a
// collapsible desktop sidebar that changes the content area's width
// without the viewport changing at all. Each page wraps its filter row
// in a `@container` div (see call sites) so these breakpoints measure
// that row's real box, correctly reacting to the sidebar toggle too.
//
// Each value is the smallest round number comfortably above the real
// minimum width that specific row needs to fit in one line (search +
// every date/select field + gaps + the page's own container padding,
// measured directly in a browser — not a guess): "740" is /records'
// 3-field row (real minimum ~728px), "840" is admin /requests' 4-field
// row (~828px), "960" is admin /replies' 5-field row (~946px, its extra
// AI 검토 select).
export type FilterRowBreakpoint = "740" | "840" | "960";
