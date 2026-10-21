# Manager artwork: mandatory generation rules

Read before any manager portrait or figure update.

## Current Cesar set and body-size rule — October 21, 2026
- Managers have different body sizes. Cesar has a MEDIUM build, matching Wasi's body-size category. Preserve those differences; never give every manager one generic body. Use Wasi's approved whole figures as Cesar's build and proportion references, while keeping Cesar's blue suit, pale lavender-blue shirt, brown shoes, and own facial identity.
- The owner selected the illustrated Cesar figure supplied as `Unknown-6(2).png` (also `Unknown-6.png`) as the identity/style baseline. Preserve the longer oval/soft rectangular face, low swept-back black hair, heavier eyelids, longer nose, cheek moles, sparse stubble, and warm tan skin. Do not revert to a rounder generic head or a photographic rendering.
- Current assets: `assets/avatars/cesar-20261021-medium.png` and `assets/managers-cesar-20261021-medium/cesar-{standing,seated,eliminated}.webp`. Each full pose was generated coherently, with a connected shaded neck and collar; packaging used only uniform whole-image resizing and transparent canvas placement.
- Standing and bench-seated canvases remain 360 x 720; eliminated remains 350 x 376 in the original LMS viewport. Match the pose-specific head-to-body balance and original site baselines. Keep the standing jacket buttoned, seated jackets open, and the eliminated figure sad, cross-legged on the floor, and fully colored.
- The owner explicitly authorized pushing and publishing this complete set once proportions matched, with no further approval pause. This supersedes the earlier review-only instructions below for this set. Earlier rejected assets remain rejected. Future requests to review before publication still require review.
- Keep all four integration sources synchronized: `prepare-manager-avatars.mjs`, `challenge-live.js`, `manager-hero.js`, and `prepare-manager-hero.mjs`. No global sizing, crown, seating, or animation changes are needed for this set.

## HARD RULE: never fit separate heads onto bodies — owner correction October 20, 2026
- NEVER cut out, paste, composite, fit, or independently resize a separate head onto a body. This ban applies to standing, bench-seated, ground-seated/eliminated, alternate-pose, and header manager artwork.
- Never use jaw-shaped cutout masks, pasted face layers, cloned neck pixels, neck patches, or head-fitting scripts to assemble or repair a manager figure. Matching measurements or preserving body pixels does not make this method acceptable.
- Generate each complete pose as ONE coherent image. Draw the head, naturally shaded neck, collar, shoulders, and body together so the anatomy, perspective, shading, and illustration style agree.
- Use the approved portrait as a facial-identity reference. Use the original approved full figure of the SAME pose as the visual reference for build, clothing, hands, stance, head-to-body scale, canvas framing, and foot baseline. Use Garrett and Kat for rendering style only. Do not copy their facial anatomy.
- Preserve the established visual proportions and pose through whole-image generation. Do not paste original body pixels back into a generated figure. After generation, whole-image export, uniform resizing, and transparent canvas placement are allowed; independent head transforms and body-part recombination are forbidden.
- Reject a figure with a detached chin, neck/collar mismatch, pasted edge, or incorrect body proportions. Correct it through a new coherent whole-figure generation, never through head replacement or neck patching.
- This correction supersedes ALL older manager instructions to keep body pixels immutable, replace only a head, fit a head to pixel coordinates, or repair a bounded head/neck join. Historical assets and measurements below remain visual references, not permission to reuse those techniques. This manager rule does not change the separate NFL player workflow.
- The owner rejected the earlier Cesar head-composited standing, seated, and eliminated drafts. Do not publish, repair, reuse, or treat those drafts as approved references. Use the current identity baseline specified above.
- A portrait approval alone does not approve body artwork. Honor any request to review the complete set before publication, unless the owner subsequently authorizes publication as recorded above.

## Cesar rollback and rejected update — October 20, 2026
- After viewing the published figures alongside the other managers, the owner rejected the October 20 update: the face did not match the established illustration style and the head looked smaller. The owner requested a revert. This rejection supersedes the earlier isolated-head approval and publication authorization.
- Restore Cesar's original avatar from the index.html AV map, standing/seated figures from `assets/managers-v4/cesar-{standing,seated}.webp`, and elimination frame from `assets/managers-lms-v1/ground-seated-sad.png` with its original frames.json geometry.
- The entire `managers-cesar-20261020-approved` set and `avatars/cesar-20261020-approved.png` are rejected despite their filenames. Do not restore them or treat their head as the current identity master. The rejected October 20/21 drafts remain non-production; the current October 21 medium-build set is specified above.
- Cause: the earlier portrait retained photographic details that differed from Garrett/Kat's illustration style. Those figure drafts also changed the established build and head-to-body scale. A matching canvas or alpha bounding box does not establish matching anatomical proportions.
- Future attempts must follow the hard rule above: generate the complete figure coherently from the approved portrait and original whole-pose reference. Match the original manager-specific visual geometry, build, clothing, and naturally shaded neck. Never assemble a new face with an old body.
- Keep prepare-manager-avatars.mjs, challenge-live.js, manager-hero.js and prepare-manager-hero.mjs synchronized. Do not change global sizing, crowns, seating or animations to compensate for artwork differences.
- That rollback kept Cesar's original artwork live pending a new set. The later October 21 authorization above supersedes that temporary hold.

## Kat update precedent — October 15, 2026
Commit `bc874cd57265f7538829216dcd4ccb2ab6cf26e3` updates four distinct assets: `assets/avatars/kat-20261015.png` and `assets/managers-kat-20261015/kat-{standing,seated,eliminated}.webp`. Inspect those actual images, including the sad elimination expression and connected shaded neck, rather than inferring the work from the commit title. The commit changes all four integration paths: `scripts/prepare-manager-avatars.mjs`, `scripts/challenge-live.js`, `scripts/manager-hero.js`, and `scripts/prepare-manager-hero.mjs`. The bundled header source must stay synchronized with the live source. This update does not authorize resurrecting Kat's retired trophy pose.

## Canonical assets
- Original approved standing/seated whole-figure references: assets/managers-v4/{manager}-standing.webp and -seated.webp.
- Current approved Jarrett figures: assets/managers-v8/jarrett-standing.webp and jarrett-seated.webp.
- Approved Jarrett portrait: assets/avatars/jarrett-20261005.png.
- Current Cesar assets: assets/avatars/cesar-20261021-medium.png and assets/managers-cesar-20261021-medium/cesar-{standing,seated,eliminated}.webp. His medium build uses Wasi's original whole figures as the body-size reference.
- All existing manager assets must be inspected visually before editing. Never use rejected generated bodies as references.

## Geometry references
Standing and bench-seated site canvases remain 360 x 720 pixels. Match each manager's original transparent margins, foot baseline, shoulder width, torso and leg lengths, hands, suit, trousers, shoes, and pose. Use the complete original image to judge these relationships.
Jarrett's original standing hair top is approximately 9px and chin approximately 208px; his seated hair top is approximately 99px and chin approximately 310px. These historical visual landmarks describe scale only. NEVER turn them into head-placement coordinates or cutout masks. The old 215px standing replacement and v5/v6/v7 neck repairs failed and must not guide new generation.
Changing facial identity does not authorize changing the established head-to-body balance. Do not use chibi, bobblehead, or approximate one-third-head recipes. Generate a naturally connected shaded neck and collar as part of the complete figure.

## Appearance
Exact approved facial identity; frontal; closed-mouth smile; full hair and ears; preserve skin tone and matching hands. No ties. Standing jacket buttoned, seated jacket unbuttoned. Preserve each manager's original jacket/shirt colors and pose.

## Integration and proof
Portraits flow through scripts/prepare-manager-avatars.mjs. Standing/seated figures flow through scripts/challenge-live.js; header standing figures through scripts/manager-hero.js. Update all three entry points with versioned asset URLs.
Do not alter header geometry, crowns, seating position, challenge animations or dimensions for an avatar change.
Compare original and new complete figures at the same rendered size and inspect the head/neck/collar relationship against the site's cream background. Reject any visible background wedge, detached chin, hard pasted edge, mismatched neck skin, or changed visual proportions. A transparent preview alone is insufficient. Never use a body-pixel preservation check as a reason to composite a separate head.
The rejected October 5 regenerated bodies were too short/wide and must never be published or reused.

Read `assets/ARTWORK_PROPORTIONS.md` and `assets/artwork-proportions.json` for measured baselines. The 215px head and v5/v6 neck repairs are rejected. Generate a naturally shaded neck connected to the head and collar in the same whole-figure image; never draw a flat neck patch. See `assets/references/jarrett-proportions-20261005.png` for equal-scale comparison.

October 5 correction: v7 was rejected for a floating head. Preserve the continuous shaded neck silhouette up both jaw sides; head-height checks alone do not validate the join. Current comparison: assets/references/jarrett-neck-comparison-20261005.png. Do not reuse the v7 proof as approved artwork.


## Circular portrait framing (October 5)
Jarrett's circle uses assets/avatars/jarrett-20261005-circle-v2.svg, embedding the unchanged approved portrait PNG. The 512px canvas places a uniformly scaled 552px portrait at x=-20, y=20. This is circle framing only; never apply that transform to full-body figures. Shared prepare-manager-avatars.mjs selects the file throughout the site. Preserve full hair, visible ears, and a comparable hair-to-chin occupancy to the other managers rather than including extra chest/neck.
Weekly Recap High Five and Free Agent Gold must use the same official player headshots and cover/top image crop as other player circles. Only D/ST logos use contain. Do not generate replacement faces to solve a CSS crop issue.


## Approved Last Man Standing elimination pose (October 5)
User approved the sad cross-legged ground-seated sheet. This is a separate, explicit pose exception for LMS only: hips and legs rest directly on the floor with contact shadows, closed downturned mouths and sad brows. No bench, invisible chair, hovering, or squat. Keep ordinary standing and Optimizer bench poses unchanged.
Production sheet: assets/managers-lms-v1/ground-seated-sad.png (2079 x 756, transparent, 2 rows of 5). Frame metadata: assets/managers-lms-v1/frames.json. Original approved colored mockup is the corresponding approval.png in that folder. Inline nested SVG crops the shared sheet; do not use an external-image SVG wrapper, because browsers block external resources inside SVG image files. All ten use the same scale and floor baseline. Only final eliminations from Week 5 onward select pose "eliminated". October 12 update: eliminated managers stay fully colored and opaque, with OUT WK and the actual elimination week beneath their names. Preserve the approved seated sheet. Keep each nested SVG frame clipped with its original viewport dimensions; outer figure CSS must not expose neighboring frames.

The previous 614px (120%) circle enlargement was rejected as too large. Do not restore it. Circle v2 reduces that rendered portrait size by 10%, preserves the approved face, and uses a new URL so the browser cannot keep the rejected crop.


## Homepage champion and ranking (October 6)
Kat is reigning champion. Only the homepage header uses assets/managers-champion-v1/kat-standing.webp with the approved black football trophy, full stem and brass plaque. Preserve the 360x720 canvas, visible top 9 and foot baseline 668, existing header dimensions and score interactions. Trophy ownership is independent of current standings. Header order reuses standingsSort(rows, 'standings') on DATA.standings, updates after league refreshes, and keeps the last complete order if data is partial. Do not reorder using weekly scores or assign the trophy to the current rank-one manager. Other challenge poses and circle portraits remain their canonical assets.

October 6 follow-up: User removed the homepage trophy. Restore canonical assets/managers-v4/kat-standing.webp in the header; champion variant is retired and must not be reintroduced without a new request. Automatic standings order remains enabled.

October 6 circle refinement: current Jarrett circular portrait is avatars/jarrett-20261006-circle-v3.svg. Same 552px image width/height and x=-20; y=28 (8px lower than v2). This is a tiny placement change only. Do not resize his head or change full-body artwork.

October 6 subtle circle enlargement: v4 is now avatars/jarrett-20261006-circle-v4.svg. Unchanged approved portrait embedded on 512x512 white canvas, uniform image570x570 at x=-29,y=22. Selected after equal-size visual comparison with Tyler, Nathan M, Wasi, Cesar and Bryan; slight increase from552, not the rejected614 crop. This supersedes v3 framing only. Full-body artwork and circle element sizes remain unchanged.

