# Player lineup artwork — mandatory style reference

For every new player or revised lineup figure:
1. Read `docs/lineup-artwork-protocol.md` first; it is the only workflow (generate once → `scripts/fit-player-head.py` → catalog → publish). Use TWO visual references: the approved full-body lineup asset below for body style, pose, framing and lighting, plus the player's current official headshot for identity.
2. Approved body reference: `players/4262921-faces-v2.webp` (Justin Jefferson; head 15.7% of figure height). Match the established athletic, padded full-body cutout style, front-facing stance, arms beside thighs, and feet apart. Do not substitute a slimmer, fashion-model or differently stylized figure. (`4047646-faces-v2.webp`, the previous reference, measures head 14.9% and must not be used as the head-size target; see `assets/ARTWORK_PROPORTIONS.md`.)
3. Preserve the player's own face, hair and skin tone. Match exposed limbs to their skin tone. Verify current team and jersey number. Keep the whole head, hands and cleats.
4. `scripts/fit-player-head.py` writes the transparent, visibly-cropped 850px WebP; set catalog width/height/ratio from that file and keep real heightInches metadata consistent.
5. Generate ONCE. The fit script sets the head size; do not regenerate for it (only if the script exits 2: no face found). No checks, comparison images, percentage reports or approval.
6. Use a new versioned filename to prevent stale cached artwork. Update only that player's catalog entry and preserve all other entries and unavailable variants.
7. For injury/status poses, retain the approved regular image and the status-driven restoration behavior. Preserve visual style and identity in the alternate pose.

Romeo Doubs faces-v2 was rejected because it was generated from a headshot without a full-body style reference. Do not use it as a reference. faces-v3 replaces it.

## Original lineup behavior — preserve on every update

These are existing user requirements, not new design choices. Later explicit user corrections take precedence.

- RESTING figures: use verified individual heightInches; preserve height ratios on a common baseline. Never normalize resting players to equal height. Catalog pixel height (850) is resolution, not listed physical height.
- SELECTED figures: all use the SAME enlarged target size, independent of physical height. Current size is 75% of the original enlarged target. Keep final-size image rendering sharp; do not stretch a low-resolution composited layer.
- Starting players stand only a tad forward (existing 5% perspective treatment) with gold glow. Keep the glow unclipped. No added starter labels.
- Tap, mouse hover and sliding a finger across the row select/cascade smoothly. Keep stable hit targets, keyboard navigation, vertical page scrolling and pinch zoom.
- Expand space only for selection. Leave only a small gap above/below, not a large empty block. Scores reserve NO top space and may overlap above.
- Show live and final actual fantasy scores; hide pregame/missing scores. Preserve prior-week scores until Thursday and automatic refresh.
- Player names use normal capitalization. Only the NAME opens the player card.
- Current roster membership controls displayed players. Preserve regular images and status-specific crutches/front-handcuff assets; restore regular images when healthy and active.
- Keep matchup sticky above the lineup at mobile widths; preserve roster/matchup swipe transitions, circular navigation and nested gesture ownership.

## Required update checks (code and styling changes only; an artwork-only update skips all of these)

Run `node scripts/test-lineup-rules.mjs`, `node scripts/test-lineup-status.mjs` and `node scripts/test-lineup-live-scores.mjs`. For interaction/sizing changes also run `node scripts/test-lineup-spotlight.mjs` and `node scripts/test-roster-swipe.mjs` with Playwright available.
For new assets, verify official heights and update `height-reference.json`; `scripts/audit-lineup-assets.mjs` checks every catalog entry against ESPN and image metadata. Review the visual proof as required above; automated checks cannot prove facial likeness or artistic consistency.

- All currently displayed crutch and handcuff variants appear nearly grayscale with a small amount of color retained (28% saturation), visibly distinct from active players. The tint must disappear automatically with the alternate image on healthy/active restoration; do not tint regular figures.

- An explicit current-week ESPN projected total of 0 also selects an available injury variant, even if ESPN still labels the player active. Actual scores, missing projections, and previous-week projections must not trigger this. Keep the existing non-health variant for Josh Jacobs.

## DST mascot lineup assets

DSTs use the user-approved AFC/NFC mascot designs in `mascots/`, indexed by ESPN proTeamId in `mascots.json`. Keep these separate from the human player catalog and verified human heights. Mascot `displayHeight:73` is an intentional display scale, not a claimed real-world height. Jets, Chargers, Giants and Packers are custom concepts.

Preserve the same roster membership, starter glow, selection, live/final score and name-only card behavior. Label line one is the city/state (for example Minnesota); line two is the team nickname plus DST (Vikings DST). Retain the actual ESPN DST player ID for cards and scores. Never apply player injury or zero-projection crutch rules to team mascots.

## Saved proportion baseline
Also read `assets/ARTWORK_PROPORTIONS.md` and `assets/artwork-proportions.json`. These preserve the original manager/player distinction, reference-image landmarks, player catalog dimensions and heights. Keep the current catalog authoritative; never replace the baseline with a rejected draft.

## BYE weeks (October 6)
Confirmed NFL byes share the 28% saturation treatment, including DST mascots. Use the verified full current-season schedule; missing data is not a bye. A bye alone keeps regular artwork and must not trigger crutches from its zero projection. Preserve actual injury/suspension variants. Recalculate using current week so bye tint automatically clears; independently injured players stay muted. Shared game context displays BYE.

## Projection recovery correction (October 7)
A finite positive ESPN projection for the current scoring week and current NFL season restores the regular player image and clears injury tint, even when ESPN still carries an injury/inactive label. An explicit zero reapplies an available injury variant; Josh Jacobs uses his existing front-handcuff variant. A confirmed bye alone keeps regular artwork with bye tint. Missing, nonnumeric, actual, prior-week and prior-season values never count as a restored projection. When current projection data is missing, preserve the existing status-based fallback. Keep both regular and alternate assets.

Free-agent correction (October 7): Tyreek Hill wears beach shorts with no shirt and no crutches. Free agents (explicit ESPN proTeamId 0) use 28% saturation without injury variants. The free-agent condition overrides injury/zero-projection poses and clears when ESPN assigns a team. Missing team IDs are not confirmed free agents.

## Head size (October 15)
Head size is set by `scripts/fit-player-head.py` on each generated figure (see `docs/lineup-artwork-protocol.md`). The earlier October 7 additions with undersized heads and the October 14 rules (18%/16.5%/15.5% targets, head-cutout compositor, prompt-only "+15%" construction, Drake Maye reference) are superseded; do not use them or their outputs as references.

## Visible crop rule — October 14 lineup-gap correction (applied by `scripts/fit-player-head.py`)
For every new or revised human lineup asset, compute the crop from visible alpha (opacity >=128), not alpha >0: nearly invisible generator noise must never determine canvas width. Keep two source pixels of edge padding, retain antialiasing within that crop, resize proportionally to 850px high, and set catalog width, height and ratio from the resulting file. Use new versioned filenames. Apply the same packaging to regular, crutch and free-agent variants. Never compensate for padded images with global spacing, negative margins, distorted bodies or physical-height changes. This is an asset-preparation rule, not a publishing check.

## Crutch artwork stance — owner correction October 14
Before generating or editing any status artwork, open an existing approved image of that SAME status. For crutches, use `assets/team-photos/players/4047646-crutches-v1.webp` as the pose reference in addition to the player's regular artwork and official headshot. Match the established upright standing pose: BOTH legs straight, BOTH normal cleats planted on the same baseline, with one silver underarm crutch on each side. Preserve the regular lower body and add crutches; only adjust hands to hold the grips. Never lift a foot, bend a knee backward, invent a hopping/one-leg stance, cast, boot or missing limb unless the owner explicitly requests it. The October 14 Montgomery, Deebo Samuel, Shipley and Henderson crutches-v1/v2 poses were rejected; do not use them as references. Their crutches-v3 replacements restore the established pose. Read and use existing section artwork BEFORE creating new artwork. The no-publishing-checks instruction does not waive this preparation rule; no new publication gate or proof artifact is required.
