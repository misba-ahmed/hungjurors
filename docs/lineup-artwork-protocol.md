# Lineup artwork rules for every AI editor
These instructions apply to every new or edited lineup image: regular players, crutches, injury poses, trades, free agents and uniform changes. Follow them during creation; do not add publishing gates, evidence records or separate approval steps.

## Required inputs and proportions
Read assets/team-photos/STYLE_GUIDE.md, assets/ARTWORK_PROPORTIONS.md and assets/artwork-proportions.json before creating artwork. Use the current catalog as authoritative.
Use the actual approved full-body reference assets/team-photos/players/4047646-faces-v2.webp AND the player's official headshot as image inputs. When editing, also use the player's current approved body. Open the source references before generation; do not replace them with a text description.
Owner correction (October 14): target hair-top-to-chin head height at approximately 18% of the full visible figure height for every new or revised NFL player image. This supersedes both the older 16–17% guide and the rejected 20% target. The approved reference remains the body, pose and lighting reference; do not copy its older smaller head scale. Preserve the player's likeness and natural shaded neck. No tiny heads, bobbleheads, stretched faces, detached heads or flat neck patches. Never apply the manager head/body ratio to players.
Preserve athletic build, padded shoulders, torso/leg proportions, lighting, skin tone, hair, uniform and complete hands/cleats. Adding crutches, a box or another prop must not shrink the head or redesign the body.
Use the approved reference to judge the generated result as part of creating it. Including requirements in a prompt does not establish that the output follows them. Correct visible proportion/identity errors before using the asset; do not claim an inspection you did not perform.

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
