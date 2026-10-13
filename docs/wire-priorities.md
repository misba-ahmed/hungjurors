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
