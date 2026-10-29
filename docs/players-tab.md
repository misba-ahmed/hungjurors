# Players tab (League HQ)

Oct 29, 2026 refresh: `scripts/players-toolbar.js` + `styles/players-toolbar.css`, both added by `prepare-site.mjs` (index.html untouched). The build routes `hj40RefreshControls` through `window.hjPlayersToolbarHTML` and exposes the directory helpers it needs as `window.HJ40_API` (`state`, `actualWeek`, `actualSeason`, `projection`, `gameStarted`, `gameState`, `availableWeeks`, `currentWeek`, `refreshControls`, `ensureSeason`, `labels`). Every existing handler (position, availability, team, manager, search, PFF / Market / stat-rail sorts, reset) is reused: the new markup carries the same data attributes.

## Sticky toolbar (three rows, no taller than the old one)
- Row 1: search ("Search players") · All / Free agents toggle · a small Trend button (`data-hq40-sort-stat="trend"`, the Sleeper 24h adds/drops sort; tap again to flip) · the sort slot. In the default order the slot is the hint "Tap any stat to sort"; once a sort is chosen it becomes a navy chip: ↓/↑ + the sort's name (tap to flip the direction) and × to clear the sort.
- Row 2: four small dropdowns — Team, Manager, Season (2026/2025), stat period (Total, Per game, Wk n) — plus a red × (`data-hq40-reset`, the site's own reset) whenever a filter is set or the order is not the default. Season/period mirror the old year/period buttons (`HJ40.year`, `HJ40.period`).
- Row 3: position chips (All, QB, RB, WR, TE, Flex, K, DST).
- There is no Sort By dropdown: sorting is done by tapping the FPTS / PROJ buttons, the PFF / Market boxes, the Trend button or a stat in the rail.
- The default order is this week's projections, descending. The old "Trend 24h" default is gone: `prepare-player-stat-bars.mjs` no longer sets `statSort:'trend'` at load and `hj40DefaultPlayerView` (reset) no longer sets it either. The waiver-wire "open" link still opens the tab sorted by trend on purpose.

## Card tiles
The card keeps its original THIS WEEK · SEASON · PFF GRADE · MARKET strip (same markup and styling; the ⓘ buttons stay; the Market box is rounded on the right like THIS WEEK is on the left). Inside THIS WEEK and SEASON the big number and sub line are replaced by two small side-by-side buttons, **FPTS** and **PROJ E/V**, set in the stat bar's own type (Public Sans 9px: label 400 uppercase, value 850). Each is its own sort target (`data-hj-sort="weekActual|week|seasonActual|season"`); the sorted one gets the site's sort mark (brass underline, as on PFF / Market and the stat bar). Tapping it again flips the direction. The E/V letter sits in the PROJ label (brass E = ESPN, navy V = Vegas); only that letter flips the source, the rest of the button sorts. New sort keys `weekActual` / `seasonActual` are applied by an outermost wrapper of `hjDirectoryFilteredRows` (players without a value go last).

On phones the strip is split by content, not in equal quarters: 90 : 90 : 82 : 62 (THIS WEEK, SEASON, PFF, MARKET). At 360px that is the least each needs (two six-digit values with room on each side / "PFF GRADE ⓘ" / "MARKET ⓘ"); with equal quarters the two-number boxes clip. Below 381px the gaps between boxes are 2px. Checked with a script that measures every button, label and value of all 400 rendered players at 360 / 375 / 390 / 430 / 1280 px: nothing touches a border.

The footnote that used to sit under the list is gone; the hint lives in the toolbar.
