# Artwork proportions: durable reference
Read together with MANAGER_ARTWORK_RULES.md and team-photos/STYLE_GUIDE.md before any artwork change.

## Measurement sources
artwork-proportions.json records actual canvas dimensions and alpha bounds for all 20 original manager figures, plus a snapshot of every player catalog entry (resolution, aspect ratio and listed physical height). Alpha bounds use opacity >=128. These bounds measure image extent, NOT anatomical landmarks.
Original full-body files are the geometry templates. Never infer a new body from a text description or a portrait alone. Do not create separate before/after proof artifacts.

## Managers
360 x 720 original canvases. Preserve transparent margins, foot baseline, shoulder width, torso/leg lengths, pose and garment colors. Preserve each individual's build. Standing jackets buttoned; seated jackets open; no ties.
Jarrett original standing: visually measured hair top approximately 9, chin approximately 208, shirt opening approximately 260. Hair-to-chin approximately 200 px. Approved new face must fit this scale, not the rejected 215 px head.
Jarrett original seated: hair top approximately 99, chin approximately 310, shirt opening approximately 353. Hair-to-chin approximately 210 px. The seated source has its own geometry; do not force its head size to the standing source in native pixels.
These facial landmarks are visual estimates; compare directly with the source image. Do not crop away the visible neck or move the collar upward. Preserve original neck shading. A neck silhouette drawn as a flat shape is not an acceptable replacement.
Do not distort the approved face to hit a number: scale uniformly and retain identity. Keep heads comparable within each rendered challenge. Do not globally resize other managers.
Canonical Jarrett current files: managers-v8/jarrett-standing.webp and jarrett-seated.webp. Original body templates remain managers-v4. The v5/v6 collar repairs were rejected for neck/head proportions.

## Players
Canonical visual reference: team-photos/players/4047646-faces-v2.webp, 850 px native height. Use its actual image alongside the official individual headshot for every generation.
Visual landmark estimates for that reference: hair top near 0; chin near 140; shirt V near 175; soles near 849. These describe that reference only. The current owner target is 16–17%, using 16.5% during controlled composition. The earlier October 14 increases to 18% and 20% are superseded. Never apply the roughly 30% manager ratio to NFL players.
Every regular player uses their own verified heightInches for RESTING height on a common baseline. The uniform 850 px asset resolution does not mean equal physical heights.
SELECTED player figures share one enlarged target height independent of actual physical height; current target is 75% of the original enlargement. Preserve sharpness from native assets.
The canonical player supplies body style, shoulders, pose and lighting. Identify each new player’s own landmarks and use the composition command to set head size. Preserve resting physical-height behavior independently.
Keep existing crutch/status variants, retained color, automatic restoration, scores, selection and roster membership behavior. Do not apply human height/injury rules to mascots.

## Update discipline
Before changing art: read these references, inspect original art, identify exactly what is changing.
During creation, preserve a continuous shaded neck, full figure anatomy and unaffected body dimensions. Follow the owner workflow below; this does not require a separate inspection or publishing pass.
Update the dimension snapshot only when a deliberate approved asset change occurs. Do not overwrite the reference with a rejected draft. Catalog remains the current player source of truth; snapshot is the baseline.

October 5 correction: v7 was rejected for a floating head. Preserve the continuous shaded neck silhouette up both jaw sides; head-height checks alone do not validate the join. Current comparison: assets/references/jarrett-neck-comparison-20261005.png. Do not reuse the v7 proof as approved artwork.

## Visible crop rule — October 14 lineup-gap correction
For every new or revised human lineup asset, compute the crop from visible alpha (opacity >=128), not alpha >0: nearly invisible generator noise must never determine canvas width. Keep two source pixels of edge padding, retain antialiasing within that crop, resize proportionally to 850px high, and set catalog width, height and ratio from the resulting file. Use new versioned filenames. Apply the same packaging to regular, crutch and free-agent variants. Never compensate for padded images with global spacing, negative margins, distorted bodies or physical-height changes. This is an asset-preparation rule, not a publishing check.

## Owner instruction: no publishing checks
The owner explicitly forbids publishing checks, automated publishing gates, mandatory test/inspection passes, proof artifacts and extra approval rounds. Do not add them or make publishing conditional on them. Apply these artwork rules while doing the requested work, then publish. This supersedes older conflicting check/proof instructions in this repository.

Head percentage reporting: A generation prompt's requested ratio is not a measured result. Use hair-top-to-chin divided by visible hair-top-to-soles height; exclude neck, transparent margins and shadows. Anatomical landmarks are approximate, so label reported values approximate. Never label an output 18% or 20% merely because that number was in its prompt. The October 14 Mevis drafts labeled 20% and 18% were rejected and must not become proportion references.

## Consistent generation source
Use the Consistent generation contract in `docs/lineup-artwork-protocol.md`. It defines the layer construction command, player-specific landmarks and new-player workflow. The target is 16.5% within the owner’s 16–17% range. Source recipes are reusable editing inputs, not review evidence; anatomical landmark placement remains approximate.
