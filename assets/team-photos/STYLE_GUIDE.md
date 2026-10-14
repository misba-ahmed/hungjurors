# Player lineup artwork — mandatory style reference

For every new player or revised lineup figure:
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
The initial October 7 additions (Shipley/Cousins faces-v1, Hill free-agent-v1, and Barkley/Jackson/Rice crutches-v1) had undersized heads. Do not use these as proportion references. Compare revised art at equal full-figure height against the approved A.J. Brown reference, and compare enlarged head/neck crops. The 850px output size and catalog height checks cannot validate head scale. Keep the natural shaded neck continuous and preserve clothing, status behavior and physical-height metadata. Saved comparison: assets/references/player-head-proportions-20261007.webp.

## Current player head size (October 14 owner correction)
For every future new or revised NFL player figure, target hair-top-to-chin head height at approximately 18% of the full visible figure height. The owner rejected the smaller heads produced under the old 16–17% guide. Use the approved A.J. Brown image for body style, pose and lighting, while applying this larger head target. Scale uniformly and preserve identity, visible neck shading and a continuous join. Do not change manager proportions, resting physical-height ratios, or selected sizing. Keep prior artwork unless the owner requests its revision.

## Visible crop rule — October 14 lineup-gap correction
For every new or revised human lineup asset, compute the crop from visible alpha (opacity >=128), not alpha >0: nearly invisible generator noise must never determine canvas width. Keep two source pixels of edge padding, retain antialiasing within that crop, resize proportionally to 850px high, and set catalog width, height and ratio from the resulting file. Use new versioned filenames. Apply the same packaging to regular, crutch and free-agent variants. Never compensate for padded images with global spacing, negative margins, distorted bodies or physical-height changes. This is an asset-preparation rule, not a publishing check.

## Owner instruction: no publishing checks
The owner explicitly forbids publishing checks, automated publishing gates, mandatory test/inspection passes, proof artifacts and extra approval rounds. Do not add them or make publishing conditional on them. Apply these artwork rules while doing the requested work, then publish. This supersedes older conflicting check/proof instructions in this repository.

Head percentage reporting: A generation prompt's requested ratio is not a measured result. Use hair-top-to-chin divided by visible hair-top-to-soles height; exclude neck, transparent margins and shadows. Anatomical landmarks are approximate, so label reported values approximate. Never label an output 18% or 20% merely because that number was in its prompt. The October 14 Mevis drafts labeled 20% and 18% were rejected and must not become proportion references.
