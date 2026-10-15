# Player lineup artwork — mandatory style reference

## Owner update — fast generation, check and correction (October 14, 2026)
For NEW roster players without artwork, use the existing site style and references, then follow `docs/lineup-artwork-protocol.md#fast-new-player-workflow`. Target 15.5%, accept 15–16%, and allow at most ONE corrective image edit after the first generation. Stop after its recheck; do not run a correction loop. Preserve adult facial shape and photographic texture. Do not resize existing approved artwork to match this new target. The owner now authorizes a quick image-level proportion check, a targeted correction when needed, and a recheck of that correction. This specific instruction supersedes older bans on artwork inspections for this step. Keep the remaining speed rules: no browser review, unrelated tests, proof files or extra approval rounds. Do not use the generation-trial experiments as the production workflow or resize existing approved artwork as part of this task.


For every new player or revised lineup figure (restorations reuse existing intact artwork):
1. Read this file BEFORE generating. Use TWO visual references: an approved existing full-body lineup asset for body style, pose, framing, lighting and proportions, plus the player's current official headshot for identity. A headshot alone is not sufficient.
2. Approved body reference: `players/4047646-faces-v2.webp`. Match the established athletic, padded full-body cutout style, readable head size, front-facing stance, arms beside thighs, and feet apart. Do not substitute a slimmer, fashion-model or differently stylized figure.
3. Preserve the player's own face, hair and skin tone. Match exposed limbs to their skin tone. Verify current team and jersey number. Keep the whole head, hands and cleats.
4. Produce a transparent, tightly cropped WebP at 850px high. Keep catalog width/height/ratio accurate and real heightInches metadata consistent.
5. Match the approved body style while creating the artwork. Do not add publication checks, proof artifacts or approval steps.
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

## Owner workflow
No publishing checks, mandatory test runs, proof artifacts or extra approval rounds. Apply the artwork and integration rules directly while making requested changes.

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

## Head proportion correction (October 7)
The initial October 7 additions had undersized heads and must not supply head proportions. Use the current measurement definition; do not use the withdrawn cutout compositor. Keep the natural shaded neck, clothing, status behavior and physical-height metadata. Historical visual reference: assets/references/player-head-proportions-20261007.webp.

## Current player head size (October 14 owner correction)
Owner correction (October 14, 8:50 PM America/Chicago): use **15–16%**, with **15.5%** as the construction target, for hair-top-to-chin divided by visible hair-top-to-planted-soles height. This supersedes the earlier 16–17% range, 16.5% target, and withdrawn 18% and 20% targets. Follow `docs/lineup-artwork-protocol.md`; preserve a continuous head/neck/shoulder connection. The polygon-cutout compositor is withdrawn after visible seams and neck misalignment. Preserve identity, natural shaded necks, body geometry, physical-height metadata and all lineup behavior. Another player is a style reference, never the numeric ruler.

## Visible crop rule — October 14 lineup-gap correction
For every new or revised human lineup asset, compute the crop from visible alpha (opacity >=128), not alpha >0: nearly invisible generator noise must never determine canvas width. Keep two source pixels of edge padding, retain antialiasing within that crop, resize proportionally to 850px high, and set catalog width, height and ratio from the resulting file. Use new versioned filenames. Apply the same packaging to regular, crutch and free-agent variants. Never compensate for padded images with global spacing, negative margins, distorted bodies or physical-height changes. This is an asset-preparation rule, not a publishing check.

## Owner instruction: no publishing checks
The owner explicitly forbids publishing checks, automated publishing gates, mandatory test/inspection passes, proof artifacts and extra approval rounds. Do not add them or make publishing conditional on them. Apply these artwork rules while doing the requested work, then publish. This supersedes older conflicting check/proof instructions in this repository.

Head percentage reporting: A generation prompt's requested ratio is not a measured result. Use hair-top-to-chin divided by visible hair-top-to-soles height; exclude neck, transparent margins and shadows. Anatomical landmarks are approximate, so label reported values approximate. Never label an output 18% or 20% merely because that number was in its prompt. The October 14 Mevis drafts labeled 20% and 18% were rejected and must not become proportion references.

## Crutch artwork stance — owner correction October 14
Before generating or editing any status artwork, open an existing approved image of that SAME status. For crutches, use `assets/team-photos/players/4047646-crutches-v1.webp` as the pose reference in addition to the player's regular artwork and official headshot. Match the established upright standing pose: BOTH legs straight, BOTH normal cleats planted on the same baseline, with one silver underarm crutch on each side. Preserve the regular lower body and add crutches; only adjust hands to hold the grips. Never lift a foot, bend a knee backward, invent a hopping/one-leg stance, cast, boot or missing limb unless the owner explicitly requests it. The October 14 Montgomery, Deebo Samuel, Shipley and Henderson crutches-v1/v2 poses were rejected; do not use them as references. Their crutches-v3 replacements restore the established pose. Read and use existing section artwork BEFORE creating new artwork. The no-publishing-checks instruction does not waive this preparation rule; no new publication gate or proof artifact is required.

## Consistent generation source
Use the Consistent generation contract in `docs/lineup-artwork-protocol.md`. It defines player-specific landmarks and the 15.5% target within the owner’s 15–16% range. The cutout-based layer workflow failed and is withdrawn. Anatomical landmark placement remains approximate.
