# Manager artwork: mandatory preservation rules

Read before any manager portrait or figure update. User-approved bodies are immutable templates, not prompts to regenerate.

## Cesar rollback and rejected update — October 20, 2026
- After viewing the published figures alongside the other managers, the owner rejected the October 20 update: the face did not match the established illustration style and the head looked smaller. The owner requested a revert. This rejection supersedes the earlier isolated-head approval and publication authorization.
- Restore Cesar's original avatar from the index.html AV map, standing/seated figures from `assets/managers-v4/cesar-{standing,seated}.webp`, and elimination frame from `assets/managers-lms-v1/ground-seated-sad.png` with its original frames.json geometry.
- The entire `managers-cesar-20261020-approved` set and `avatars/cesar-20261020-approved.png` are rejected despite their filenames. Do not restore them or treat their head as the current identity master. All earlier October 20/21 drafts remain non-production.
- Cause: the generated portrait retained fine photographic features and shading that differ from the simplified Garrett/Kat illustration style. Generating complete pose images also changed the original bodies and head-to-body scale. Matching canvas size, overall alpha bounds and foot baseline did not preserve anatomical head size or original body pixels.
- For any future attempt, preserve the actual original body pixels outside the bounded head/neck repair region. Use the existing manager-specific head geometry. Whole-figure resizing cannot correct a smaller head relative to the body. Keep the original neck shading and a continuous jaw/collar join. Use Garrett and Kat for rendering style only, without copying facial anatomy.
- Keep prepare-manager-avatars.mjs, challenge-live.js, manager-hero.js and prepare-manager-hero.mjs synchronized. Do not change global sizing, crowns, seating or animations to compensate for artwork differences.
- The current request authorizes restoration and diagnosis, not another replacement design. Leave the original Cesar artwork live until the owner requests a new attempt.

## Kat update precedent — October 15, 2026
Commit `bc874cd57265f7538829216dcd4ccb2ab6cf26e3` updates four distinct assets: `assets/avatars/kat-20261015.png` and `assets/managers-kat-20261015/kat-{standing,seated,eliminated}.webp`. Inspect those actual images, including the sad elimination expression and connected shaded neck, rather than inferring the work from the commit title. The commit changes all four integration paths: `scripts/prepare-manager-avatars.mjs`, `scripts/challenge-live.js`, `scripts/manager-hero.js`, and `scripts/prepare-manager-hero.mjs`. The bundled header source must stay synchronized with the live source. This update does not authorize resurrecting Kat's retired trophy pose.

## Canonical assets
- Original approved standing/seated bodies: assets/managers-v4/{manager}-standing.webp and -seated.webp.
- Jarrett updated head: assets/managers-v8/jarrett-standing.webp and jarrett-seated.webp.
- Approved Jarrett portrait: assets/avatars/jarrett-20261005.png.
- All existing manager assets must be inspected visually before editing. Never use rejected generated bodies as references.

## Exact Jarrett geometry
Both canvases remain 360 x 720 pixels. Keep the original body pixels, original transparent padding, feet baseline, hands, suit, trousers, shoes, shoulder width, torso length and leg length. Do not trim or normalize the completed canvas.
Standing replacement head: top 9px, height 200px, horizontally centered at x=180. Seated replacement head: top 99px, height 215px, centered at x=180. Source head is aspect-ratio preserved.
The v5 tapered head cut FAILED: it removed collar/neck pixels and left a visible background wedge below the jaw. Never reuse that mask as a finished result. Preserve the continuous jaw-to-neck-to-shirt junction; repair that bounded junction when replacing a head. Preserve all body pixels outside the explicitly repaired neck/collar region. Do not treat a numeric head boundary as permission to erase collar pixels.
Changing head appearance is not authorization to enlarge the head or change body proportions. Do not describe these figures as chibi, bobblehead, or use approximate one-third-head recipes.

## Appearance
Exact approved facial identity; frontal; closed-mouth smile; full hair and ears; preserve skin tone and matching hands. No ties. Standing jacket buttoned, seated jacket unbuttoned. Preserve each manager's original jacket/shirt colors and pose.

## Integration and proof
Portraits flow through scripts/prepare-manager-avatars.mjs. Standing/seated figures flow through scripts/challenge-live.js; header standing figures through scripts/manager-hero.js. Update all three entry points with versioned asset URLs.
Do not alter header geometry, crowns, seating position, challenge animations or dimensions for an avatar change.
Compare old/new at the same rendered size AND inspect both poses enlarged against the site's cream background. Reject any visible background wedge, detached chin, hard pasted edge, or mismatched neck skin. A transparent preview alone is insufficient. Check neck/collar joins and alpha edges; verify original opaque body pixels below the edited head match before/after. Use lossless encoding when preserving body pixels.
The rejected October 5 regenerated bodies were too short/wide and must never be published or reused.

Read `assets/ARTWORK_PROPORTIONS.md` and `assets/artwork-proportions.json` for measured baselines. The 215px head and v5/v6 neck repairs are rejected. Preserve the original shaded neck; do not regenerate it as a flat shape. See `assets/references/jarrett-proportions-20261005.png` for equal-scale comparison.

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
