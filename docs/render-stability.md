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

## Phone memory (October 7, 2026, measured on the iPhone)
Jetsam logs from the user's phone show every pinch crash is a memory kill: Safari's page process (WebContent, 1.3–1.65 GB) and its GPU process (315–436 MB, which holds decoded images and layer backing stores) were killed for "highwater" while the system was out of memory. Safari Web Inspector on the phone (Timelines → Memory) showed the page holding ~1 GB before any zoom: ~480 MB JavaScript, ~500 MB page structure. Layers → ~82 MB of backing stores at the top of the page. Pinch zoom re-renders those backing stores at the new scale, so the first pinch tipped the system over.

Repairs (no visual or behavioral change):
- NFL headshots (~250 unique, 600×436 = ~1 MB decoded each, shown in 17–74px circles) are requested from ESPN's image combiner at 350×254 (`scripts/prepare-phone-memory.mjs`). Same PNG, transparency and 404-on-missing (initials fallback unchanged), ≥3× sharp in every circle. The weekly recap feature photo (up to 150px wide) keeps the full file via `hjEspnFullImg`. Runtime ESPN API headshot URLs (depth charts) go through `hjEspnImg`.
- Team logos (500×500; the Jets file is 4096×4096) use the combiner at 330×330, 3× the largest 110px use (`nflLogo` in `scripts/prepare-render-stability.mjs`).
- The trophy loop video (an 8 MB base64 data URL) is written by the build as an ordinary file in `assets/site-art/` (`extractSiteMedia` in `scripts/site-artwork.mjs`). Same bytes and `<video>` attributes.
- The league-wide injury feed (8.8 MB, every minute) differs between fetches only in its leading `timestamp`. When the rest is identical, the statuses already derived from it are kept instead of parsing 8.8 MB of JSON again; the report time still advances. (The kona player pools were checked too: ESPN reorders their stats between identical requests, so they are parsed as before.)
