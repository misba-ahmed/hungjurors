# Player lineup artwork — mandatory style reference

## Owner update — Drake Maye reference, one generation, no measurements (October 14, 2026, 9:19 PM America/Chicago)
For NEW roster players, use the approved Drake Maye figure `assets/team-photos/players/4431452-faces-v2.webp` as the primary visual reference for head/body balance, athletic body style, stance and lighting. Attach the new player's official headshot for identity. Target **15.5–16% hair-to-chin / hair-to-planted-soles**, aiming at **15.75%**, in the first generation. Follow `docs/lineup-artwork-protocol.md#first-generation-construction`. Generate the connected figure once, perform normal asset packaging, and publish when requested. Do not measure output anatomy, calculate landmark coordinates, run proportion checks, make automatic corrective edits, create proof files, or ask for a percentage-based approval. This supersedes the earlier measurement/correction workflow and pixel-coordinate prompt. Preserve existing approved artwork. Treat the percentage as a generation target; do not report it as an achieved or verified result.


For every new player or revised lineup figure (restorations reuse existing intact artwork):
1. Read this file BEFORE generating. Use TWO visual references: the approved Drake Maye full-body lineup asset for body style, pose, framing, lighting and visual head/body balance, plus the player's current official headshot for identity. A headshot alone is not sufficient.
2. Primary visual reference: Drake Maye, `players/4431452-faces-v2.webp`. Match the established athletic, padded full-body cutout style, readable head size, front-facing stance, arms beside thighs, and feet apart. Do not substitute a slimmer, fashion-model or differently stylized figure.
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
The initial October 7 additions had undersized heads and must not supply head proportions. Use the current visual-reference workflow; do not use the withdrawn cutout compositor. Keep the natural shaded neck, clothing, status behavior and physical-height metadata. Historical visual reference: assets/references/player-head-proportions-20261007.webp.

## Current player head size (October 14 owner correction)
Owner correction (October 14, 9:19 PM America/Chicago): use **15.5–16%**, with **15.75%** as the construction target, for hair-top-to-chin divided by visible hair-top-to-planted-soles height. This supersedes the earlier 15–16% range and 15.5% target, the 16–17% range and 16.5% target, and the withdrawn 18% and 20% targets. Follow `docs/lineup-artwork-protocol.md`; preserve a continuous head/neck/shoulder connection. The polygon-cutout compositor is withdrawn after visible seams and neck misalignment. Preserve identity, natural shaded necks, body geometry, physical-height metadata and all lineup behavior. Drake Maye supplies the visual head/body balance; the percentage remains a prompt target without an output-measurement requirement.

## Visible crop rule — October 14 lineup-gap correction
For every new or revised human lineup asset, compute the crop from visible alpha (opacity >=128), not alpha >0: nearly invisible generator noise must never determine canvas width. Keep two source pixels of edge padding, retain antialiasing within that crop, resize proportionally to 850px high, and set catalog width, height and ratio from the resulting file. Use new versioned filenames. Apply the same packaging to regular, crutch and free-agent variants. Never compensate for padded images with global spacing, negative margins, distorted bodies or physical-height changes. This is an asset-preparation rule, not a publishing check.

## Owner instruction: no publishing checks
The owner explicitly forbids publishing checks, automated publishing gates, mandatory test/inspection passes, proof artifacts and extra approval rounds. Do not add them or make publishing conditional on them. Apply these artwork rules while doing the requested work, then publish. This supersedes older conflicting check/proof instructions in this repository.

Head percentage reporting: 15.5–16% is the requested generation target. Do not measure or report an output percentage in this workflow. Do not describe a prompt target or the Drake Maye reference as a verified numeric result. The rejected Mevis drafts and withdrawn head-pasting outputs remain unsuitable references.

## Crutch artwork stance — owner correction October 14
Before generating or editing any status artwork, open an existing approved image of that SAME status. For crutches, use `assets/team-photos/players/4047646-crutches-v1.webp` as the pose reference in addition to the player's regular artwork and official headshot. Match the established upright standing pose: BOTH legs straight, BOTH normal cleats planted on the same baseline, with one silver underarm crutch on each side. Preserve the regular lower body and add crutches; only adjust hands to hold the grips. Never lift a foot, bend a knee backward, invent a hopping/one-leg stance, cast, boot or missing limb unless the owner explicitly requests it. The October 14 Montgomery, Deebo Samuel, Shipley and Henderson crutches-v1/v2 poses were rejected; do not use them as references. Their crutches-v3 replacements restore the established pose. Read and use existing section artwork BEFORE creating new artwork. The no-publishing-checks instruction does not waive this preparation rule; no new publication gate or proof artifact is required.

## Consistent generation source
Use the Consistent generation contract in `docs/lineup-artwork-protocol.md`. It assigns Drake Maye the primary visual-reference role and the official headshot the identity role. Generate once with the 15.75% target, then package and publish as requested. No anatomical measurements, automatic corrections or extra approval steps.
