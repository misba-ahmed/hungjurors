# Artwork proportions: durable reference

## Owner update — Drake Maye reference, one generation, no measurements (October 14, 2026, 9:19 PM America/Chicago)
For NEW roster players, use the approved Drake Maye figure `assets/team-photos/players/4431452-faces-v2.webp` as the primary visual reference for head/body balance, athletic body style, stance and lighting. Attach the new player's official headshot for identity. Target **15.5–16% hair-to-chin / hair-to-planted-soles**, aiming at **15.75%**, in the first generation. Follow `docs/lineup-artwork-protocol.md#first-generation-construction`. Generate the connected figure once, perform normal asset packaging, and publish when requested. Do not measure output anatomy, calculate landmark coordinates, run proportion checks, make automatic corrective edits, create proof files, or ask for a percentage-based approval. This supersedes the earlier measurement/correction workflow and pixel-coordinate prompt. Preserve existing approved artwork. Treat the percentage as a generation target; do not report it as an achieved or verified result.

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
Primary visual reference: Drake Maye, `team-photos/players/4431452-faces-v2.webp`. Use his actual approved image alongside the new player's official headshot. Drake supplies visual head/body balance, pose, padded body style and lighting. He is not a numerically calibrated template. The target remains 15.5–16%, aiming at 15.75% in the first-generation prompt. Do not measure the output's anatomy or run an automatic correction. Preserve the original `4047646-faces-v2.webp` as a historical style asset. Keep manager proportions separate from NFL player artwork.
Every regular player uses their own verified heightInches for RESTING height on a common baseline. The uniform 850 px asset resolution does not mean equal physical heights.
SELECTED player figures share one enlarged target height independent of actual physical height; current target is 75% of the original enlargement. Preserve sharpness from native assets.
Preserve resting physical-height behavior independently of the Drake Maye visual reference. Never copy Drake's physical height into another player's metadata.
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

Head percentage reporting: 15.5–16% is the requested generation target. Do not measure or report an output percentage in this workflow. Do not describe a prompt target or the Drake Maye reference as a verified numeric result. The rejected Mevis drafts and withdrawn head-pasting outputs remain unsuitable references.

## Consistent generation source
Use the Consistent generation contract in `docs/lineup-artwork-protocol.md`. It assigns Drake Maye the primary visual-reference role and the official headshot the identity role. Generate once with the 15.75% target, then package and publish as requested. No anatomical measurements, automatic corrections or extra approval steps.
