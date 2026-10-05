# Manager artwork: mandatory preservation rules

Read before any manager portrait or figure update. User-approved bodies are immutable templates, not prompts to regenerate.

## Canonical assets
- Original approved standing/seated bodies: assets/managers-v4/{manager}-standing.webp and -seated.webp.
- Jarrett updated head: assets/managers-v6/jarrett-standing.webp and jarrett-seated.webp.
- Approved Jarrett portrait: assets/avatars/jarrett-20261005.png.
- All existing manager assets must be inspected visually before editing. Never use rejected generated bodies as references.

## Exact Jarrett geometry
Both canvases remain 360 x 720 pixels. Keep the original body pixels, original transparent padding, feet baseline, hands, suit, trousers, shoes, shoulder width, torso length and leg length. Do not trim or normalize the completed canvas.
Standing replacement head: top 9px, height 215px, horizontally centered at x=180. Seated replacement head: top 99px, height 215px, centered at x=180. Source head is aspect-ratio preserved.
The v5 tapered head cut FAILED: it removed collar/neck pixels and left a visible background wedge below the jaw. Never reuse that mask as a finished result. Preserve the continuous jaw-to-neck-to-shirt junction; repair that bounded junction when replacing a head. Preserve all body pixels outside the explicitly repaired neck/collar region. Do not treat a numeric head boundary as permission to erase collar pixels.
Changing head appearance is not authorization to enlarge the head or change body proportions. Do not describe these figures as chibi, bobblehead, or use approximate one-third-head recipes.

## Appearance
Exact approved facial identity; frontal; closed-mouth smile; full hair and ears; preserve skin tone and matching hands. No ties. Standing jacket buttoned, seated jacket unbuttoned. Preserve each manager's original jacket/shirt colors and pose.

## Integration and proof
Portraits flow through scripts/prepare-manager-avatars.mjs. Standing/seated figures flow through scripts/challenge-live.js; header standing figures through scripts/manager-hero.js. Update all three entry points with versioned asset URLs.
Do not alter header geometry, crowns, seating position, challenge animations or dimensions for an avatar change.
Compare old/new at the same rendered size AND inspect both poses enlarged against the site's cream background. Reject any visible background wedge, detached chin, hard pasted edge, or mismatched neck skin. A transparent preview alone is insufficient. Check neck/collar joins and alpha edges; verify original opaque body pixels below the edited head match before/after. Use lossless encoding when preserving body pixels.
The rejected October 5 regenerated bodies were too short/wide and must never be published or reused.
