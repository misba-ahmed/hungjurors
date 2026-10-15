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
Head size is set by `scripts/fit-player-head.py` on the generated image, never eyeballed and never re-rolled. After the single generation, run `python3 scripts/fit-player-head.py GENERATED.png OUT.webp`: it detects the face (OpenCV YuNet model in `assets/references/models/`), measures `head` (hair top to chin), `face` (brow to chin) and `width` (face width) as percentages of the figure's visible height, and if `head` is outside the band it rescales the head+neck about the collar point toward 15.7% (limited by the face-to-shoulder width rule and +15% per pass), then writes the tight-cropped 850px WebP. Use that file as the asset; nothing else is run for an artwork update. (`scripts/check-player-heads.py` is an audit tool for the catalog, not part of updates.)

Band (league owner's requirement, October 15, 2026): **head 15.2–16.2%, fitted toward 15.7%** when outside (the league owner picked 15.7% by eye from a five-size strip on October 15, 2026); face ≥ 12.8%; width ≥ 9.3%; face width ≤ 0.29× shoulder width (catalog median 0.285; above ~0.31 looks like a bobblehead, which is why the fit is capped by width and by +15% per pass rather than forced to the height number). For an 850px figure that is a chin about 129–138px below the hair top (aim ~133px). Image generators default to realistic adult proportions (head ≈ 13–14% of standing height); the lineup is deliberately a little bigger-headed, so ask for it in the prompt ("head slightly larger than realistic, about about 15–16% of total height, like a stylized sports collectible figure") and let the fit script settle the exact number. One generation per figure; never regenerate for head size; no checks or comparisons afterwards.

Head-size references (measured): Justin Jefferson `team-photos/players/4262921-faces-v2.webp` (head 15.7%, face 13.7%, width 10.3%; arms beside thighs, feet apart), Jalen Hurts `4040715-faces-v2.webp` (15.6%, short hair), Derrick Henry `3043078-faces-v2.webp` (15.8%), Terry McLaurin `3121422-faces-v2.webp` (15.8%). 

Correction (October 15, 2026): the long-standing canonical reference A.J. Brown `4047646-faces-v2.webp` actually measures head 14.9% (chin ≈ 126px, not the "near 140" previously written here; that figure was an estimate). It sits in the smallest tenth of the catalog, which is why figures generated to "match the reference" kept coming out small-headed. Keep it for pose/lighting/cutout style if useful, but never as the head-size target. Catalog medians are head 16.5%, face 13.4%, width 9.9%; approved figures outside today's band are history and are not regenerated because of the number.

Every regular player uses their own verified heightInches for RESTING height on a common baseline. The uniform 850 px asset resolution does not mean equal physical heights.
SELECTED player figures share one enlarged target height independent of actual physical height; current target is 75% of the original enlargement. Preserve sharpness from native assets.
Body width, shoulders, pose and lighting come from the reference and the prompt; the fit script leaves them untouched. Resting lineup heights are checked separately by the existing lineup tests. Never use the roughly 30% manager-head ratio for NFL player artwork.
Keep existing crutch/status variants, retained color, automatic restoration, scores, selection and roster membership behavior. Do not apply human height/injury rules to mascots.

## Update discipline
Before changing art: read these references, inspect original art, identify exactly what is changing.
After (manager artwork): compare both full figures and enlarged head/neck crops on cream background; reject visible seams, exposed background wedges, flattened neck shading or altered body dimensions. Player figures: the fit script's output is final and is published immediately.
Update the dimension snapshot only when a deliberate approved asset change occurs. Do not overwrite the reference with a rejected draft. Catalog remains the current player source of truth; snapshot is the baseline.

October 5 correction: v7 was rejected for a floating head. Preserve the continuous shaded neck silhouette up both jaw sides; head-height checks alone do not validate the join. Current comparison: assets/references/jarrett-neck-comparison-20261005.png. Do not reuse the v7 proof as approved artwork.

## Visible crop rule — October 14 lineup-gap correction
For every new or revised human lineup asset, compute the crop from visible alpha (opacity >=128), not alpha >0: nearly invisible generator noise must never determine canvas width. Keep two source pixels of edge padding, retain antialiasing within that crop, resize proportionally to 850px high, and set catalog width, height and ratio from the resulting file. Use new versioned filenames. Apply the same packaging to regular, crutch and free-agent variants. Never compensate for padded images with global spacing, negative margins, distorted bodies or physical-height changes. This is an asset-preparation rule, not a publishing check.

## Owner instruction: no publishing checks
The owner explicitly forbids publishing checks, automated publishing gates, mandatory test/inspection passes, proof artifacts and extra approval rounds. Do not add them or make publishing conditional on them. Apply these artwork rules while doing the requested work, then publish. This supersedes older conflicting check/proof instructions in this repository.

Head percentage reporting: 15.5–16% is the requested generation target. Do not measure or report an output percentage in this workflow. Do not describe a prompt target or the Drake Maye reference as a verified numeric result. The rejected Mevis drafts and withdrawn head-pasting outputs remain unsuitable references.

## Consistent generation source
Use the Consistent generation contract in `docs/lineup-artwork-protocol.md`. It assigns Drake Maye the primary visual-reference role and the official headshot the identity role. Generate once with the 15.75% target, then package and publish as requested. No anatomical measurements, automatic corrections or extra approval steps.
