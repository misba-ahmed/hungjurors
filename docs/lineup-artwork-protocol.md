# Lineup artwork rules for every AI editor
These instructions apply to every new or edited lineup image: regular players, crutches, injury poses, trades, free agents and uniform changes. Follow them during creation; do not add publishing gates, evidence records or separate approval steps.

## Required inputs and proportions
Read assets/team-photos/STYLE_GUIDE.md, assets/ARTWORK_PROPORTIONS.md and assets/artwork-proportions.json before creating artwork. Use the current catalog as authoritative.
Use the actual approved full-body reference assets/team-photos/players/4047646-faces-v2.webp AND the player's official headshot as image inputs. When editing, also use the player's current approved body. Open the source references before generation; do not replace them with a text description.
Owner correction (October 14, evening): restore **16–17%**, with **16.5%** as the construction target, for hair-top-to-chin divided by visible hair-top-to-planted-soles height. This supersedes the 18% and 20% targets. Follow `docs/lineup-artwork-protocol.md`; preserve a continuous head/neck/shoulder connection. The polygon-cutout compositor is withdrawn after visible seams and neck misalignment. Preserve identity, natural shaded necks, body geometry, physical-height metadata and all lineup behavior. Another player is a style reference, never the numeric ruler.
Preserve athletic build, padded shoulders, torso/leg proportions, lighting, skin tone, hair, uniform and complete hands/cleats. Adding crutches, a box or another prop must not shrink the head or redesign the body.
Use the approved reference for body style during creation and measure head geometry directly in the image. Including requirements in a prompt does not establish that the output follows them. Correct visible proportion/identity errors before using the asset; do not claim an inspection you did not perform.

## Asset integration
Use a new versioned transparent, tightly cropped WebP, 850px high, and accurate catalog width/height/ratio. Preserve verified individual heightInches, original files, regular artwork and alternative poses.
Preserve the existing resting-height ratios, selected-size behavior, scores, interactions and status restoration. Use the saved injury, bye, free-agent and Josh Jacobs rules. A trade pose must not falsely depict injury. Keep mascots separate from human proportion/status rules.
For managers, follow assets/MANAGER_ARTWORK_RULES.md and preserve the original body geometry; this player guide does not replace manager requirements.

## Owner workflow preference
“Check roster lineups” means identify needed updates, make them and publish. Work quickly. No new publishing gate, review-evidence manifest, proof artifact, extra approval round or unrelated test pass. Follow artwork requirements while making the image rather than treating speed as permission to ignore them.
This instruction supersedes older requirements for comparison-proof files, mandatory test runs, inspections and publishing checks.
Every AI editor must read this file through its entry-point instructions. No instruction file can guarantee another model's behavior; do not promise absolute enforcement.

## Visible crop rule — October 14 lineup-gap correction
For every new or revised human lineup asset, compute the crop from visible alpha (opacity >=128), not alpha >0: nearly invisible generator noise must never determine canvas width. Keep two source pixels of edge padding, retain antialiasing within that crop, resize proportionally to 850px high, and set catalog width, height and ratio from the resulting file. Use new versioned filenames. Apply the same packaging to regular, crutch and free-agent variants. Never compensate for padded images with global spacing, negative margins, distorted bodies or physical-height changes. This is an asset-preparation rule, not a publishing check.

## Owner instruction: no publishing checks
The owner explicitly forbids publishing checks, automated publishing gates, mandatory test/inspection passes, proof artifacts and extra approval rounds. Do not add them or make publishing conditional on them. Apply these artwork rules while doing the requested work, then publish. This supersedes older conflicting check/proof instructions in this repository.

Head percentage reporting: A generation prompt's requested ratio is not a measured result. Use hair-top-to-chin divided by visible hair-top-to-soles height; exclude neck, transparent margins and shadows. Anatomical landmarks are approximate, so label reported values approximate. Never label an output 18% or 20% merely because that number was in its prompt. The October 14 Mevis drafts labeled 20% and 18% were rejected and must not become proportion references.

## Crutch artwork stance — owner correction October 14
Before generating or editing any status artwork, open an existing approved image of that SAME status. For crutches, use `assets/team-photos/players/4047646-crutches-v1.webp` as the pose reference in addition to the player's regular artwork and official headshot. Match the established upright standing pose: BOTH legs straight, BOTH normal cleats planted on the same baseline, with one silver underarm crutch on each side. Preserve the regular lower body and add crutches; only adjust hands to hold the grips. Never lift a foot, bend a knee backward, invent a hopping/one-leg stance, cast, boot or missing limb unless the owner explicitly requests it. The October 14 Montgomery, Deebo Samuel, Shipley and Henderson crutches-v1/v2 poses were rejected; do not use them as references. Their crutches-v3 replacements restore the established pose. Read and use existing section artwork BEFORE creating new artwork. The no-publishing-checks instruction does not waive this preparation rule; no new publication gate or proof artifact is required.

## Consistent generation contract

The owner target remains 16–17%, using 16.5% as the midpoint. Let T = top of hair, C = bottom of chin excluding neck, and S = bottom of planted soles in the same image. Measure `(C-T)/(S-T)`. Exclude transparent margins, shadows, crutches and props. An 850px file is not necessarily an 850px visible figure. Identify actual landmarks during creation; another player and a prompt percentage are not measurements.

### Withdrawn October 14 compositor

The owner rejected the outputs of commit 9de4463 because they show pasted-on heads, jaw/neck seams and abnormal neck proportions. The polygon masks captured neck/side pixels; resizing those patches around the chin and blending over the original neck did not create a continuous anatomical join. A numeric head ratio did not prevent these defects. The compositor, its extracted source layers and its five outputs have been removed. Do not recreate this method or treat its former recipes as approved templates.

The catalog restores the intact pre-enlargement artwork for Lloyd (faces-v1), Winston (faces-v1), Montgomery (crutches-v3), Harrison (faces-v4) and Marks (faces-v2). This restoration removes the failed composite edits. It does not establish that all restored images meet 16–17%.

### Future edits

Use the player's intact artwork as the edit source, the official headshot for identity, and the established reference for body style. Preserve body geometry, identity, natural neck length, collar position and continuous lighting. When a head adjustment requires changes at the join, edit the head and neck connection together in the image editor. Do not paste a scaled polygon of face and neck onto the existing neck. Do not stretch the neck, move the collar or compress the body to meet a percentage.

Measure the actual hair-top, chin and sole positions as part of creating the image. A prompt target alone cannot establish compliance. There is currently no proven automatic construction method in this repository that guarantees both precise anatomy and seamless blending. Do not claim otherwise or reintroduce an unproven automatic correction as a solved workflow.

Physical height remains independent: preserve verified heightInches for resting figures and the existing selected-size behavior. Catalog ratio means image width/height. Keep status restoration and every unrelated interaction unchanged.

The owner still requests fast creation and publishing without separate browser reviews, tests, proof artifacts or approval rounds. Do not use that preference to excuse an obvious defect or invent a measurement that was never made.
