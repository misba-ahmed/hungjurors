# Shared section scrolling

Rosters and Side Challenges must use the same scrolling and swiping implementation as Matchups. `scripts/section-scroll.js` contains the extracted matchup controller. `scripts/matchup-navigation.js` connects the three sections to it. Do not restore separate touch-translation handlers or temporary trackpad rails.

Every section uses a persistent horizontal scroll container. Native touch scrolling moves content with the finger. Desktop horizontal wheel deltas move `scrollLeft` with the same pixel distance, reversal, and idle snapping used by Matchups. Circular touch navigation, explicit tab navigation, keyboard arrows, nested rail ownership, vertical page scrolling and pinch zoom remain available. Player showcases and zoomed challenge lineups retain their own gestures.

The extra containers add no padding, margins or gap. Measure only the selected page after scrolling settles. Never reserve the tallest page's height, add minimum-height floors, or stretch shorter pages to a shared height. Recalculate after a disclosure, live update or rotation. Clear interrupted gesture state when the container width changes, then align the selected page with the new width.

Roster pages retain their manager-specific data and the selected manager persists through live updates. Challenges retain the original active controls and their listeners; inactive previews use the same rendering functions and become inert until selected. The active challenge IDs occur only once.

Run the required lineup tests and `scripts/test-roster-swipe.mjs` (the shared section regression suite), `scripts/test-challenge-swipe.mjs`, and `scripts/test-trackpad-site.mjs`. Test portrait-landscape-portrait cycles, continuous movement before settling, reversal, circular touch navigation, nested rails, disclosures, refreshes, and exact selected-page heights in Chromium and WebKit.
