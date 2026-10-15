# Lineup artwork rules for every AI editor

## Owner update — Drake Maye reference, one generation, no measurements (October 14, 2026, 9:19 PM America/Chicago)
For NEW roster players, use the approved Drake Maye figure `assets/team-photos/players/4431452-faces-v2.webp` as the primary visual reference for head/body balance, athletic body style, stance and lighting. Attach the new player's official headshot for identity. Target **15.5–16% hair-to-chin / hair-to-planted-soles**, aiming at **15.75%**, in the first generation. Follow `docs/lineup-artwork-protocol.md#first-generation-construction`. Generate the connected figure once, perform normal asset packaging, and publish when requested. Do not measure output anatomy, calculate landmark coordinates, run proportion checks, make automatic corrective edits, create proof files, or ask for a percentage-based approval. This supersedes the earlier measurement/correction workflow and pixel-coordinate prompt. Preserve existing approved artwork. Treat the percentage as a generation target; do not report it as an achieved or verified result.

These instructions apply to every new or edited lineup image: regular players, crutches, injury poses, trades, free agents and uniform changes. Follow them during creation; do not add publishing gates, evidence records or separate approval steps.

## Required inputs and proportions
Read assets/team-photos/STYLE_GUIDE.md, assets/ARTWORK_PROPORTIONS.md and assets/artwork-proportions.json before creating artwork. Use the current catalog as authoritative.
Use the actual approved Drake Maye full-body image `assets/team-photos/players/4431452-faces-v2.webp` AND the new player's official headshot as image inputs. Open both source images before generation. Drake supplies visual proportions, pose, body style and lighting; the headshot supplies identity. For a requested edit to an existing player, use that player's intact approved image as the edit target. Keep the original `4047646-faces-v2.webp` as a historical style asset; do not attach competing full-body proportion references for a new player.
Owner correction (October 14, 9:19 PM America/Chicago): use **15.5–16%**, with **15.75%** as the construction target, for hair-top-to-chin divided by visible hair-top-to-planted-soles height. This supersedes the earlier 15–16% range and 15.5% target, the 16–17% range and 16.5% target, and the withdrawn 18% and 20% targets. Follow `docs/lineup-artwork-protocol.md`; preserve a continuous head/neck/shoulder connection. The polygon-cutout compositor is withdrawn after visible seams and neck misalignment. Preserve identity, natural shaded necks, body geometry, physical-height metadata and all lineup behavior. Drake Maye supplies the visual head/body balance; the percentage remains a prompt target without an output-measurement requirement.
Preserve athletic build, padded shoulders, torso/leg proportions, lighting, skin tone, hair, uniform and complete hands/cleats. Adding crutches, a box or another prop must not shrink the head or redesign the body.
Apply the visual reference and identity instructions during the first generation. Preserve a continuous shaded neck and adult facial proportions. Do not add an output-measurement or correction stage. Never claim a numerical result or inspection that did not occur.

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

Head percentage reporting: 15.5–16% is the requested generation target. Do not measure or report an output percentage in this workflow. Do not describe a prompt target or the Drake Maye reference as a verified numeric result. The rejected Mevis drafts and withdrawn head-pasting outputs remain unsuitable references.

## Crutch artwork stance — owner correction October 14
Before generating or editing any status artwork, open an existing approved image of that SAME status. For crutches, use `assets/team-photos/players/4047646-crutches-v1.webp` as the pose reference in addition to the player's regular artwork and official headshot. Match the established upright standing pose: BOTH legs straight, BOTH normal cleats planted on the same baseline, with one silver underarm crutch on each side. Preserve the regular lower body and add crutches; only adjust hands to hold the grips. Never lift a foot, bend a knee backward, invent a hopping/one-leg stance, cast, boot or missing limb unless the owner explicitly requests it. The October 14 Montgomery, Deebo Samuel, Shipley and Henderson crutches-v1/v2 poses were rejected; do not use them as references. Their crutches-v3 replacements restore the established pose. Read and use existing section artwork BEFORE creating new artwork. The no-publishing-checks instruction does not waive this preparation rule; no new publication gate or proof artifact is required.

## Consistent generation contract

The target is **15.5–16%**, aiming at **15.75%**, for hair top to chin divided by visible hair top to planted soles. Neck, transparent margins, shadows, crutches and props do not belong to the head span. This defines the generation request; it does not require output measurements. Drake Maye is a visual reference, with no claim that his figure has a measured ratio in this range.

### First-generation construction

Use exactly two inputs for a new regular figure, in this order: **1. the approved Drake Maye full-body figure; 2. the new player's official headshot**. Lead with the visual task: create a new player in the same lineup style and with Drake's prominent head/body balance. Keep the requested 15.75% target in the prompt. Give each reference one clear role. Do not include the earlier hypothetical canvas coordinates, a second body reference, a rejected draft, correction calculations or a future head-enlargement plan.

Preserve the new player's adult face shape, hair, beard and skin tone from the official headshot. Preserve natural face width-to-height and photographic texture. Use Drake's image for the overall visual proportions, padded football build, front-facing stance, natural neck connection and lighting. Adapt the build to the new player without making a tall, small-headed fashion figure. Use the verified current uniform and jersey. The player's own `heightInches` remains independent of the reference image.

Use this prompt with verified details filled in:

> Create one full-body lineup cutout of [PLAYER], using image 1 (the approved Drake Maye figure) as the primary visual template. Carry over its prominent head/body balance, athletic padded build, front-facing stance, relaxed arms, natural neck length and photographic lighting. Construct the head at a target of 15.75% of the visible figure height, within 15.5–16%: hair top to chin relative to hair top to planted soles, excluding neck and transparent margins. Image 2 is [PLAYER]'s official headshot. Use that player's face, adult jaw shape, hair, beard, eyes and skin tone throughout. Replace Drake's identity and uniform with [PLAYER] wearing [VERIFIED TEAM UNIFORM], jersey [NUMBER]. Keep natural facial width-to-height and realistic skin texture. Render the entire head, shaded neck, collar and shoulders together as one continuous anatomical form. Match the template's full-body stance with both legs straight, feet apart, both cleats planted on the same baseline, and arms beside the thighs. Show all hair, hands and cleats. Use true alpha transparency with a small margin. Keep the whole figure sharp. No helmet, props, detached head, stretched neck, compressed torso, toy styling, enlarged eyes, additional figure or labels.

For a requested status variant, use the player's intact regular image as the edit target, the official headshot for identity and the approved same-status pose reference. Preserve the player's established head/body balance. Follow the existing crutch, free-agent and uniform rules. Do not introduce a separate head-resizing step.

The prompt gives a clear visual target. Image generation can vary; do not promise an exact percentage or describe the reference as a calibrated template. No anatomy measurement, correction loop or extra approval follows generation.

### Withdrawn October 14 compositor

The owner rejected the outputs of commit 9de4463 because they show pasted-on heads, jaw/neck seams and abnormal neck proportions. The polygon masks captured neck/side pixels; resizing those patches around the chin and blending over the original neck did not create a continuous anatomical join. A numeric head ratio did not prevent these defects. The compositor, its extracted source layers and its five outputs have been removed. Do not recreate this method or treat its former recipes as approved templates.

The catalog restores the intact pre-enlargement artwork for Lloyd (faces-v1), Winston (faces-v1), Montgomery (crutches-v3), Harrison (faces-v4) and Marks (faces-v2). This restoration removes the failed composite edits. It does not establish that all restored images meet 15.5–16%.

### Future edits

Use the player's intact artwork as the edit source, the official headshot for identity, and the established reference for body style. Preserve body geometry, identity, natural neck length, collar position and continuous lighting. When a head adjustment requires changes at the join, edit the head and neck connection together in the image editor. Do not paste a scaled polygon of face and neck onto the existing neck. Do not stretch the neck, move the collar or compress the body to meet a percentage.

Make only the image edits the owner requests. Preserve the approved head/body balance and connected anatomy through the image editor. Do not perform anatomical measurements or automatic numerical corrections. Keep the withdrawn compositor out of the workflow.

Physical height remains independent: preserve verified heightInches for resting figures and the existing selected-size behavior. Catalog ratio means image width/height. Keep status restoration and every unrelated interaction unchanged.

The owner still requests fast creation and publishing without separate browser reviews, tests, proof artifacts or approval rounds. Do not use that preference to excuse an obvious defect or invent a measurement that was never made.

## Fast new-player workflow

1. **Prepare the inputs.** Open the approved Drake Maye figure and the new player's official headshot. Verify the player's team, jersey and physical height from the existing approved sources.
2. **Generate once.** Use the first-generation prompt above with both actual images. Request the 15.75% target and the complete connected figure. Do not schedule a measurement, correction or second version.
3. **Package and publish as requested.** Apply the existing visible-alpha crop, proportional 850px sizing, versioned filename and catalog dimensions. This is ordinary file preparation. Do not measure anatomy, create proof artifacts, load the site for a review, run an artwork test suite or ask for additional percentage approval.

Keep the completion concise: say which player was added or updated and whether publishing completed. Do not add a timing breakdown or percentage report. If the owner explicitly asks to test a preview first, show that single preview and follow the scope of that request. A generation failure or an obvious unusable output does not justify claiming success; describe the concrete problem without inventing a numerical gate.

## Explicit owner approval — Kendre Miller (October 14, 2026)
The owner approved the third generated Kendre Miller image (the second correction) shown in their 7:59:57 PM screenshot and rejected the final correction as too cartoonish. Use `assets/team-photos/players/4599739-faces-v2.webp`, packaged from that intact approved image. Its prior approximate head measurement was 15.7%. The owner approved it before the later target change; preserve that approval independently of subsequent target changes. Stop correcting an image once the owner explicitly approves it. Preserve its rendering and anatomy; do not run another numerical adjustment on it.
