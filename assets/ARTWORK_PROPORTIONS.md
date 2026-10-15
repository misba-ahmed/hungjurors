# Artwork proportions: durable reference

Read together with MANAGER_ARTWORK_RULES.md and team-photos/STYLE_GUIDE.md before any artwork change.

## Measurement sources
artwork-proportions.json records actual canvas dimensions and alpha bounds for all 20 original manager figures, plus a snapshot of every player catalog entry (resolution, aspect ratio and listed physical height). Alpha bounds use opacity >=128. These bounds measure image extent, NOT anatomical landmarks.
Original full-body files are the geometry templates. Never infer a new body from a text description or a portrait alone.

## Managers
360 x 720 original canvases. Preserve transparent margins, foot baseline, shoulder width, torso/leg lengths, pose and garment colors. Preserve each individual's build. Standing jackets buttoned; seated jackets open; no ties.
Jarrett original standing: visually measured hair top approximately 9, chin approximately 208, shirt opening approximately 260. Hair-to-chin approximately 200 px. Approved new face must fit this scale, not the rejected 215 px head.
Jarrett original seated: hair top approximately 99, chin approximately 310, shirt opening approximately 353. Hair-to-chin approximately 210 px. The seated source has its own geometry; do not force its head size to the standing source in native pixels.
These facial landmarks are visual estimates; compare directly with the source image. Do not crop away the visible neck or move the collar upward. Preserve original neck shading. A neck silhouette drawn as a flat shape is not an acceptable replacement.
Do not distort the approved face to hit a number: scale uniformly and retain identity. Keep heads comparable within each rendered challenge. Do not globally resize other managers.
Canonical Jarrett current files: managers-v8/jarrett-standing.webp and jarrett-seated.webp. Original body templates remain managers-v4. The v5/v6 collar repairs were rejected for neck/head proportions.

## Players
Head size and packaging are set by `scripts/fit-player-head.py` on the generated image; the workflow is `docs/lineup-artwork-protocol.md` (generate once → fit script → catalog → publish; nothing else). Band 15.2–16.2% hair-top-to-chin over visible figure height, fitted toward 15.7% (the owner's pick, October 15, 2026) by scaling the whole head+neck about the collar, never more than +15% and never past a face width of 0.29× the shoulders (a bobblehead). Heads already in or above the band are left alone.

Body reference: Justin Jefferson `team-photos/players/4262921-faces-v2.webp` (measured head 15.7%; arms beside thighs, feet apart). Also in band: Hurts `4040715-faces-v2.webp` 15.6%, Henry `3043078-faces-v2.webp` 15.8%, McLaurin `3121422-faces-v2.webp` 15.8%. A.J. Brown `4047646-faces-v2.webp` measures 14.9% (its chin is ≈126px, not the "near 140" once written here) and Drake Maye `4431452-faces-v2.webp` 17.3%; neither is a head-size reference. Catalog medians: head 16.5%, face 13.4%, width 9.9%; approved figures outside the band stay as they are.

Every regular player uses their own verified heightInches for RESTING height on a common baseline. The uniform 850 px asset resolution does not mean equal physical heights.
SELECTED player figures share one enlarged target height independent of actual physical height; current target is 75% of the original enlargement. Preserve sharpness from native assets.
Body width, shoulders, pose and lighting come from the reference and the prompt; the fit script leaves them untouched. Never use the roughly 30% manager-head ratio for NFL player artwork.
Keep existing crutch/status variants, retained color, automatic restoration, scores, selection and roster membership behavior. Do not apply human height/injury rules to mascots.

## Update discipline
Before changing art: read these references, inspect original art, identify exactly what is changing.
After (manager artwork): compare both full figures and enlarged head/neck crops on cream background; reject visible seams, exposed background wedges, flattened neck shading or altered body dimensions. Player figures: the fit script's output is final and is published immediately.
Update the dimension snapshot only when a deliberate approved asset change occurs. Do not overwrite the reference with a rejected draft. Catalog remains the current player source of truth; snapshot is the baseline.

October 5 correction: v7 was rejected for a floating head. Preserve the continuous shaded neck silhouette up both jaw sides; head-height checks alone do not validate the join. Current comparison: assets/references/jarrett-neck-comparison-20261005.png. Do not reuse the v7 proof as approved artwork.

## Visible crop rule — October 14 lineup-gap correction (applied by `scripts/fit-player-head.py`)
For every new or revised human lineup asset, compute the crop from visible alpha (opacity >=128), not alpha >0: nearly invisible generator noise must never determine canvas width. Keep two source pixels of edge padding, retain antialiasing within that crop, resize proportionally to 850px high, and set catalog width, height and ratio from the resulting file. Use new versioned filenames. Apply the same packaging to regular, crutch and free-agent variants. Never compensate for padded images with global spacing, negative margins, distorted bodies or physical-height changes. This is an asset-preparation rule, not a publishing check.
