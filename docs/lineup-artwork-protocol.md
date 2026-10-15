# Lineup artwork rules for every AI editor

## Owner update — fast generation, check and correction (October 14, 2026)
For NEW roster players without artwork, use the existing site style and references, then follow `docs/lineup-artwork-protocol.md#fast-new-player-workflow`. The owner now authorizes a quick image-level proportion check, a targeted correction when needed, and a recheck of that correction. This specific instruction supersedes older bans on artwork inspections for this step. Keep the remaining speed rules: no browser review, unrelated tests, proof files or extra approval rounds. Do not use the generation-trial experiments as the production workflow or resize existing approved artwork as part of this task.

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

## Fast new-player workflow

Start from this site's existing approved full-body style reference and the new player's official headshot. Keep the existing generation requirements and 16–17% range, targeting 16.5%. Do not import experimental toy/caricature prompts, replacement style references or head-pasting methods. Keep verified physical height in `heightInches`; it controls resting display size independently of the artwork's head ratio.

1. **Generate once.** Create the complete connected player using the existing site style, identity, uniform and pose requirements.
2. **Check the image immediately.** At native resolution, identify T (top of hair), C (bottom of chin, excluding neck) and S (bottom of planted soles). Calculate `r = (C-T)/(S-T)`. Use the same view to catch a visible head/neck seam, unnatural neck or obvious identity error. If r is within 0.16–0.17 and the anatomy is sound, proceed straight to normal asset packaging. Do not generate another version for a result already in range. Anatomical coordinates remain approximate; if hair or beard makes a boundary unclear, use a closer view and the official headshot rather than inventing a passing value.
3. **Correct only when needed.** Use the new intact draft as the image-edit target, with the official headshot for identity and approved body reference for style. Give the editor the actual measured ratio and calculated correction. Preserve the body, chin position, collar, natural neck length, pose and soles. Render the head and its neck connection together with continuous shading. Never cut out and paste a scaled head, stretch the neck or compress the body. Allow transparent canvas space above the hair if necessary.
4. **Recheck the corrected image once.** Recalculate from its actual landmarks and inspect the head/neck join in the same view. If it still fails, correct that specific remaining defect; do not launch another prompt experiment or silently publish a miss. A requested correction is not evidence that the editor achieved it.
5. **Package and publish as requested.** Apply the existing visible-alpha crop, proportional 850px sizing, versioned filename and catalog rules. Preserve all lineup behavior. No additional site loading, browser screenshots, test suite, proof document or approval round.

### Correction calculation and edit wording

For a head-size correction with the chin and soles held in place, let `H = C-T` and `B = S-C`. The target head height is `Htarget = (0.165 / 0.835) * B`; the uniform head scale is `Htarget / H`; the target hair top is `C-Htarget`. This accounts for the changed total figure height when the head grows upward. Do not simply multiply by `0.165/r` while assuming the total height stays fixed. These numbers guide the image edit; they do not authorize a cutout compositor or guarantee the editor's output.

Use this short edit instruction with the measured values filled in:

> Edit this intact player. Its measured hair-to-chin / hair-to-soles ratio is [r]. Target 16.5%, within 16–17%. At the source resolution, hair top T=[T], chin C=[C], soles S=[S]. Keep chin and soles anchored; change head height from [H] to [Htarget] pixels, uniformly scaling facial proportions and hair by [factor]. Render the head and natural neck connection seamlessly together. Keep the collar, neck length, shoulders, torso, limbs, uniform, pose, identity and lighting consistent. Preserve transparency and add top canvas space if needed. No pasted patch, neck stretching or body compression. If output resolution changes, scale all coordinates together.

### Timing the owner's next test

Wait for the owner to name the new player. Start an elapsed-time timer when work on that player begins. Report total wall-clock time and brief preparation, generation, check/correction and packaging/publishing durations. Include the actual number of generation/edit calls and approximate final ratio. If the first image passes, report zero corrections; do not force an edit just to demonstrate one. Keep timing in the response; do not create a timing report or new publishing gate. The correction workflow is pending that test; do not claim a measured speed or successful correction before running it.

## Explicit owner approval — Kendre Miller (October 14, 2026)
The owner approved the third generated Kendre Miller image (the second correction) shown in their 7:59:57 PM screenshot and rejected the final correction as too cartoonish. Use `assets/team-photos/players/4599739-faces-v2.webp`, packaged from that intact approved image. Its prior approximate head measurement was 15.7%; do not relabel it as a measured 16–17% result. This is a specific owner-approved exception, not a change to the general target. Stop correcting an image once the owner explicitly approves it. Preserve its rendering and anatomy; do not run another numerical adjustment on it.
