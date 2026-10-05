# Artwork proportions: durable reference
Read together with MANAGER_ARTWORK_RULES.md and team-photos/STYLE_GUIDE.md before any artwork change.

## Measurement sources
artwork-proportions.json records actual canvas dimensions and alpha bounds for all 20 original manager figures, plus a snapshot of every player catalog entry (resolution, aspect ratio and listed physical height). Alpha bounds use opacity >=128. These bounds measure image extent, NOT anatomical landmarks.
Original full-body files are the geometry templates. Never infer a new body from a text description or a portrait alone. Preserve a before/after proof at equal rendered scale.

## Managers
360 x 720 original canvases. Preserve transparent margins, foot baseline, shoulder width, torso/leg lengths, pose and garment colors. Preserve each individual's build. Standing jackets buttoned; seated jackets open; no ties.
Jarrett original standing: visually measured hair top approximately 9, chin approximately 208, shirt opening approximately 260. Hair-to-chin approximately 200 px. Approved new face must fit this scale, not the rejected 215 px head.
Jarrett original seated: hair top approximately 99, chin approximately 310, shirt opening approximately 353. Hair-to-chin approximately 210 px. The seated source has its own geometry; do not force its head size to the standing source in native pixels.
These facial landmarks are visual estimates; compare directly with the source image. Do not crop away the visible neck or move the collar upward. Preserve original neck shading. A neck silhouette drawn as a flat shape is not an acceptable replacement.
Do not distort the approved face to hit a number: scale uniformly and retain identity. Keep heads comparable within each rendered challenge. Do not globally resize other managers.
Canonical Jarrett current files: managers-v7/jarrett-standing.webp and jarrett-seated.webp. Original body templates remain managers-v4. The v5/v6 collar repairs were rejected for neck/head proportions.

## Players
Canonical visual reference: team-photos/players/4047646-faces-v2.webp, 850 px native height. Use its actual image alongside the official individual headshot for every generation.
Visual landmark estimates for that reference: hair top near 0; chin near 140; shirt V near 175; soles near 849. Head/figure ratio is approximately 16–17%, a comparison aid, not a universal anatomy constraint. Hair, helmets, build and individual facial anatomy may vary. Never use the roughly 30% manager-head ratio for NFL player artwork.
Every regular player uses their own verified heightInches for RESTING height on a common baseline. The uniform 850 px asset resolution does not mean equal physical heights.
SELECTED player figures share one enlarged target height independent of actual physical height; current target is 75% of the original enlargement. Preserve sharpness from native assets.
Player body width, head scale, shoulders, pose and lighting must be compared at equal rendered height against the canonical player, then resting lineup heights must be checked separately.
Keep existing crutch/status variants, retained color, automatic restoration, scores, selection and roster membership behavior. Do not apply human height/injury rules to mascots.

## Update discipline
Before changing art: read these references, inspect original art, identify exactly what is changing.
After: compare both full figures and enlarged head/neck crops on cream background; reject visible seams, exposed background wedges, flattened neck shading or altered body dimensions.
Update the dimension snapshot only when a deliberate approved asset change occurs. Do not overwrite the reference with a rejected draft. Catalog remains the current player source of truth; snapshot is the baseline.
