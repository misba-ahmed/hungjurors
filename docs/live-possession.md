# Live possession avatar rings

The roster and matchup avatar rings use one shared snapshot from the existing NFL scoreboard refresh. They indicate team possession, not individual snap participation. No extra scoreboard polling or animation loop runs for this feature.

## Behavior

- Offense: green while its team has possession; red when ESPN confirms the red zone. Kickers follow their team's possession.
- DST: green while the opponent has possession; never red.
- Missing possession, missing situation, or a quarter break keeps the last confirmed state for up to three minutes. Incomplete payloads do not restart that timer.
- Confirmed possession changes switch both teams immediately. Halftime, final, pregame, suspension and delay clear both teams.
- Historical weeks never inherit the current week's rings. Changing feed week or season resets the snapshot.
- The existing scoreboard refresh runs about every 30 seconds during live games. A stalled request aborts after 15 seconds so the existing retry path can continue. Feed latency still applies.

## Rendering ownership

`scripts/live-possession.js` owns `data-hj-possession`. `scripts/live-updates.js` must preserve that attribute while patching an existing player row. Fresh HTML does not contain runtime possession state. Removing attributes absent from that HTML used to remove valid rings until the next scoreboard update.

The possession observer handles inserted rows, replaced avatar/content children, and changed team/position/week context. It does not observe its own ring writes, so it cannot cause an attribute feedback loop. Unchanged rings do not write to the DOM. Avatar outlines do not change layout size or gesture handling.

## October 11 audit

Found and corrected the runtime-attribute removal, incomplete-feed clearing, missing partial-row updates, and unbounded scoreboard request. The first attempt to preserve the attribute targeted source markup before the live updater was injected; its strict replacement failed and blocked deployment. Preserve the attribute in `live-updates.js` itself.

Validation: 19 model/request tests; DOM simulation of 25 successive updates across three live roots; replacement avatars; week changes; red-zone transitions; turnover; DST; stale state on returning from background; full production preparation; existing feed-contract test. Live inspection before correction showed different ring states for duplicate rows of the same Baltimore player. DOM simulation does not establish physical-iPhone behavior.

Run the focused model tests with `node --test scripts/test-live-possession.mjs`. No new publishing gate is required.
