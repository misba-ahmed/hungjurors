# Phone rendering load (October 7, 2026)

The user reported (iPhone 14 Pro Max, iOS 27.0.1) that pinch zoom anywhere crashes Safari immediately ("a problem repeatedly occurred"), that Season Challenges zoom buttons / double tap crash it too, and that the site is sluggish. The pinch crash predates the PR #17 scrolling work. Keep the current artwork, layout and interactions; do not roll back the shared scrolling.

Measured on the complete prepared site with replayed real ESPN data (Chromium, 390px, DPR 3). Headless engines cannot reproduce an iPhone process crash; these are the measured causes of continuous load and zoom-time load, not proof the crash is gone.

## Causes found and repairs (`scripts/prepare-render-stability.mjs` unless noted)
- The trophy and award-bookcase sheens animated `left`, so the page re-laid-out and repainted a blurred, blended layer every frame forever, on or off screen. Idle main thread: ~3.9 s busy per 5 s, ~57 frames/s. The keyframes now move the same sheen with `translateX` (travel / sheen width: 160/26 and 156/23) plus the existing `rotate(10deg)`. Frozen-time screenshots match except anti-aliasing (≤16/255). Idle: ~0.08 s busy per 5 s, ~1–2 frames/s.
- Endless decorative loops (sheens, payout halo/float, raffle tickets) pause while their section is more than 200px offscreen. One-shot entrance animations are never paused.
- The Wire countdown replaced its digit text nodes every second, which woke six body-wide childList decorators (DST labels, fonts, projection chips, injury badges, game context, layout repairs) to re-scan ~16k nodes every second. It now updates the existing text node. Live patches (`live-updates.js`) explicitly wake those decorators, because text/attribute-only patches never produced childList records and previously relied on the countdown side effect.
- Those decorators ignore removal-only batches (the roster rail prunes distant pages after every swipe); nothing present needs new work.
- Mobile Safari reports pinch zoom as a window `resize`. About thirty handlers re-measured or re-rendered per event. A capture-phase guard in `<head>` stops a resize while `visualViewport.scale > 1.01` and the layout viewport (`documentElement.clientWidth/Height`) is unchanged; an unzoomed resize or rotation is delivered as before. Simulated iOS-style pinch (40 steps, resize per step): page JS 3.8–4.1 s → ~60 ms.
- `folder-artwork.js` compared `img.src` on every scroll/resize check; for the ~2.5 MB data-URL artwork that serialized six fresh copies (~15 MB of garbage) per check. It now compares the attribute value.
- `matchup-row-fit.js` refit on every visual-viewport resize (continuous during pinch) and rewrote unchanged attributes before forcing layout. It skips while zoomed and writes only real changes.
- ESPN serves `teamlogos/nfl/500/nyj.png` at 4096×4096 (64 MB decoded) while other teams are 500×500. `nflLogo('nyj')` uses ESPN's combiner at 500×500 (same transparent PNG).

## Roster player cascade (`scripts/team-photos.js`)
Since PR #17 the lineup sits inside the native roster rail. iOS can give a horizontal finger sweep to that ancestor scroller (or pan the page, resizing its toolbar), cancelling the pointer stream; `pointermove.preventDefault()` cannot stop native scrolling. A non-passive `touchmove` listener now claims one-finger, horizontally dominant moves that began on the lineup (axis `x`, or ≥4px with the existing 1.15 ratio). Vertical page scrolling and pinch stay native. A window resize interrupts a sweep only when the layout width changes (rotation), not for toolbar resizes.

## Verification
`node scripts/test-render-stability.mjs` (Chromium and WebKit): compositor-only endless loops, quiet countdown, zoom-only resize suppression, Jets logo source. Also run the existing section, lineup and Wire checks. Physical iPhone confirmation is still required.
