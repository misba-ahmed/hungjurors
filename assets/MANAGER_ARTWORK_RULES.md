# Manager artwork: mandatory preservation rules

Read before any manager portrait or figure update. User-approved bodies are immutable templates, not prompts to regenerate.

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
Production sheet: assets/managers-lms-v1/ground-seated-sad.png (2079 x 756, transparent, 2 rows of 5). Frame metadata: assets/managers-lms-v1/frames.json. Original approved colored mockup is the corresponding approval.png in that folder. Inline nested SVG crops the shared sheet; do not use an external-image SVG wrapper, because browsers block external resources inside SVG image files. All ten use the same scale and floor baseline. Only final eliminations from Week 5 onward select pose "eliminated". Existing elimination fade is CSS; never bake it into face artwork.

The previous 614px (120%) circle enlargement was rejected as too large. Do not restore it. Circle v2 reduces that rendered portrait size by 10%, preserves the approved face, and uses a new URL so the browser cannot keep the rejected crop.
