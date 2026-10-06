# This Week banner rules

Approved 2026-10-06:
- Extend the existing Wire carousel; do not introduce a separate briefing or replace the other feed sections.
- The priority slide contains independent white, rounded banners with thin gold borders and narrow page-background gaps. Never use internal divider lines or one shared white container.
- Desktop: equal-sized side-by-side banners. Mobile: equal-sized compact stack. The complete group must match the original carousel window height at every breakpoint. One shared set of carousel arrows, dots, and section chips. Follow docs/wire-card-rules.md for the full interaction and sizing contract.
- The section chip reads “This Week”. Existing recap, preview, draft recap and draft hauls remain accessible.
- Last Man Standing headline: “Eliminations start this week!”
- Reuse original manager figures and site avatar helpers. Do not regenerate or resize artwork assets.
- Waivers use the existing Tuesday / pre-2-AM Wednesday Central deadline and ESPN destination. No duplicate standalone waiver slide while shown in this group.
- BYEs require the validated current-season schedule. Group current owned players, including bench, IR and DST, under their NFL teams, with their actual managers. Show all team logos in a horizontal row first, then all owned players in a compact scrollable list. Each manager name is subtext directly beneath the player name; do not place owners in a separate column. The title is “Teams on BYE this week”. The expanded-card dialog also shows the full list.
- Show the LMS announcement during Week 5 only. Weeks without BYEs or the LMS milestone retain the original single-feature behavior.
- The carousel rail height must match the selected slide; taller priority groups must never leave blank space under shorter recap/preview cards. Verify this in mobile Chromium and WebKit.
- Refreshes preserve the reader's current carousel item. No automatic timed rotation.
- Keep priority preview styles scoped: global section padding and legacy Wire player styles must not enlarge the compact rows.
- Run scripts/test-wire-priorities.mjs and verify desktop/mobile layout, expanded BYEs, challenge destination and existing section navigation before publishing changes.
