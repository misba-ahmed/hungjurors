# Wire announcement cards

Approved October 7, 2026 (supersedes the grouped This Week design):
- Put Kickoff first, Bye Week second, Last Man Standing third, then the existing remaining sections. Preserve the existing deadline and kickoff visibility windows.
- Each announcement occupies its own full carousel card and has its own bottom menu chip. Remove the shared This Week group/chip. Chips navigate within the full feed.
- Ordinary responsive card dimensions apply to every announcement. Keep white cards, brass borders, cream insets and original manager artwork.
- LMS headline: “Eliminations start this week!” Include “Lowest score this week will be eliminated.” Show the original manager lineup and a compact manager count / one elimination summary. The Week 5 visibility rule remains.
- BYE card retains validated live schedule, all owned players (bench/IR/DST), manager subtext, mirrored team columns, vertical scrolling and full expansion.
- Waivers retain their existing deadline and ESPN destination as a standalone card with their own chip.
- Preserve stable card keys, refresh position, ordinary expansion/dismissal, player/action navigation and the outer carousel's gesture ownership.
- Follow docs/wire-card-rules.md for shared behavior. Run test-wire-priorities.mjs, test-wire-announcements.mjs (desktop/mobile Chromium and WebKit), and test-card-gestures.mjs before publishing.

## October 13 — restore the original waiver card
The waiver reminder uses the original `wireWaiverCard` / `wireCard` design from before the October 6 grouped announcements update. Do not replace it with a `wp-waivers` priority panel. Preserve its deadline visibility, live countdown, ESPN destination and standard card interactions. LMS announcements remain removed from the carousel.

The waiver card uses the existing navy-and-gold `is-lead` theme, matching the Week Live card, as requested October 13. Keep its original layout, countdown and ESPN action.

## October 13 — recurring Bye Week card
Restore a standalone Bye Week card for every current NFL week with confirmed byes. Use the complete validated season schedule, show all affected owned players and their managers, and refresh when the schedule finishes loading. Keep the existing cream team panels, expansion, scrolling, gestures and stable card key. Omit the card only when the validated schedule shows no byes. Always place the Bye Week card and its chip immediately after the waiver countdown when both are visible. Ordering: Kickoff, Waivers, Bye Week, then the remaining sections.

## October 13 — multi-team bye layout
Keep at most two team columns per row in the ordinary and expanded Bye Week card. Four or six bye teams wrap into additional rows within the existing vertical scroll area; never divide the card width by the number of bye teams. Keep team logos fixed-size and allow player, manager and team names to wrap inside their own columns. Preserve mirrored right-hand teams and ordinary carousel height.

## October 13 — navy theme and shortest lists first
The Bye Week card permanently uses the waiver card's navy background, gold top edge and category label, light text, and blue inset team panels. Apply the theme to compact and expanded views. Sort NFL team panels by ascending count of league-rostered players, breaking ties alphabetically by team abbreviation; recompute from live roster data each week. Preserve two columns, vertical scrolling, player links, and its position immediately after Waivers. This supersedes the earlier white/cream color requirement for Bye Week.

Stack each of the two team columns independently. Distribute the sorted teams alternately left/right; place each subsequent team directly below the prior team in its column, with the normal gap. Do not align teams to shared grid rows that reserve space below a short list. Keep the right column mirrored in both card sizes.

## Waiver Reports: Wire on Wednesday, full history in League Activity (October 19)
- Every Wednesday report of the season is kept (`hj:waiver-history:v1:<league>:<season>`). On each check the site reads ESPN's waiver request (`WAIVER` + `WAIVER_ERROR`, same views as before) for the current and previous scoring periods; earlier periods are read once and remembered. Each Wednesday-morning run in `waiverProcessStatus` becomes one report from the claims processed that date. Reports are added or updated, never removed.
- The Wire shows the newest report card only on the Central-time Wednesday of the run (`report.date`). From Thursday 00:00 CT it leaves the carousel; a one-minute check redraws the Wire when the day changes.
- League HQ › League Activity has two sub-tabs: **Activity** (filters, metrics, the transaction feed; the default) and **Waiver Reports** (a strip of every Wednesday — Latest, Week N… — and the chosen report's claims, same rows as the Wire card via `waiverClaimRows`). The Waiver Reports tab shows a "New" tag on the Wednesday of a run. The selected tab, report and strip position survive the 30-second refresh.
- Transaction cards (`hjActivityCard`, replaced in `scripts/wire-priorities.js`): one compact header with the manager portrait(s), manager name and kind pill on the left, and the date over the time on the top right ("Wed, Oct 7" / "3:59 PM"), then the original player rows unchanged (adds and drops side by side, "+ Add" / "− Drop" above each name, coloured photo rings). The kind colours the left spine. Styling: `styles/league-activity.css` (loaded at the end of the body).
