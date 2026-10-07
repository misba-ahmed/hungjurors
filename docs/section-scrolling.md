# Shared section scrolling

Rosters and Side Challenges must use the same scrolling and swiping implementation as Matchups. `scripts/section-scroll.js` contains the extracted matchup controller. `scripts/matchup-navigation.js` connects the three sections to it. Do not restore separate touch-translation handlers or temporary trackpad rails.

Every section uses a persistent horizontal scroll container. Native touch scrolling moves content with the finger. Desktop horizontal wheel deltas move `scrollLeft` with the same pixel distance, reversal, and idle snapping used by Matchups. Circular touch navigation, explicit tab navigation, keyboard arrows, nested rail ownership, vertical page scrolling and pinch zoom remain available. Player showcases and zoomed challenge lineups retain their own gestures.

The extra containers add no padding, margins or gap. Measure only the selected page after scrolling settles. Never reserve the tallest page's height, add minimum-height floors, or stretch shorter pages to a shared height. Recalculate after a disclosure, live update or rotation. Clear interrupted gesture state when the container width changes, then align the selected page with the new width.

Roster pages retain their manager-specific data and the selected manager persists through live updates. Challenges retain the original active controls and their listeners; inactive previews use the same rendering functions and become inert until selected. The active challenge IDs occur only once.

Run the required lineup tests and `scripts/test-roster-swipe.mjs` (the shared section regression suite), `scripts/test-challenge-swipe.mjs`, and `scripts/test-trackpad-site.mjs`. Test portrait-landscape-portrait cycles, continuous movement before settling, reversal, circular touch navigation, nested rails, disclosures, refreshes, and exact selected-page heights in Chromium and WebKit.

## Stability correction
The all-pages-rendered version caused severe mobile resource pressure. Keep the native page shells and shared gesture behavior, but mount only the selected page at rest and prepare its immediate neighbors during navigation. Release distant roster artwork and challenge graphics. Cache inactive previews until their data changes; unchanged live refreshes must not recreate them. Ignore layout refits during browser pinch zoom and avoid redundant DOM attribute writes. The matchup note blends its raster artwork against its own #f9edd7 paper background, so scroll compositing cannot expose a white matte.

Run `test-section-stability.mjs` on the complete prepared site in Chromium and WebKit. It exercises player taps/cascades, repeated browser pinch, challenge zoom controls and double tap, unchanged refresh churn, bounded mounted pages and selected-page-only resize observation, and idle frame responsiveness. Functional swipe tests alone are insufficient.

Game context HTML must cache the last renderer input per status node. Font/layout decorators alter serialized HTML after rendering; comparing decorated DOM to raw source caused an idle loop across status, projection and layout observers, especially in WebKit. A changed status input must still update immediately. Keep the whole-site idle mutation regression.

## Nested gesture and zoom repair
Keep the current native scrolling architecture and visual design; the user explicitly rejected a rollback. A nested player gesture or multi-touch pinch locks out ancestor-rail population and height fitting until release. Use layout dimensions, not transformed paint bounds, for the rail height. Each page bounds its own painting without adding spacing. Player sweep targets are captured at gesture start and selection updates coalesced to animation frames; selecting a player must not rewrite score text or wake body-wide child-list observers. Scores still refresh through the existing score event. Test at deviceScaleFactor 3 with decoded artwork and assert that the finger sweep actually selects multiple players. Automated success is not proof that a physical iPhone crash has been eliminated.
