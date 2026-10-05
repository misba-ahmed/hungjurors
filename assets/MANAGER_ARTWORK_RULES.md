# Manager artwork: mandatory preservation rules

Read before any manager portrait or figure update. User-approved bodies are immutable templates, not prompts to regenerate.

## Canonical assets
- Original approved standing/seated bodies: assets/managers-v4/{manager}-standing.webp and -seated.webp.
- Jarrett updated head: assets/managers-v5/jarrett-standing.webp and jarrett-seated.webp.
- Approved Jarrett portrait: assets/avatars/jarrett-20261005.png.
- All existing manager assets must be inspected visually before editing. Never use rejected generated bodies as references.

## Exact Jarrett geometry
Both canvases remain 360 x 720 pixels. Keep the original body pixels, original transparent padding, feet baseline, hands, suit, trousers, shoes, shoulder width, torso length and leg length. Do not trim or normalize the completed canvas.
Standing replacement head: top 9px, height 215px, horizontally centered at x=180. Seated replacement head: top 99px, height 215px, centered at x=180. Source head is aspect-ratio preserved.
Standing: protect original pixels below y=224. Seated: protect below y=314. Around the jaw use a tapered mask, not a rectangular cut: protect collar, shoulders and the existing neck. Inspect the join enlarged before shipping.
Changing head appearance is not authorization to enlarge the head or change body proportions. Do not describe these figures as chibi, bobblehead, or use approximate one-third-head recipes.

## Appearance
Exact approved facial identity; frontal; closed-mouth smile; full hair and ears; preserve skin tone and matching hands. No ties. Standing jacket buttoned, seated jacket unbuttoned. Preserve each manager's original jacket/shirt colors and pose.

## Integration and proof
Portraits flow through scripts/prepare-manager-avatars.mjs. Standing/seated figures flow through scripts/challenge-live.js; header standing figures through scripts/manager-hero.js. Update all three entry points with versioned asset URLs.
Do not alter header geometry, crowns, seating position, challenge animations or dimensions for an avatar change.
Compare old/new at the same rendered size. Check neck/collar joins and alpha edges; verify original opaque body pixels below the edited head match before/after. Use lossless encoding when preserving body pixels.
The rejected October 5 regenerated bodies were too short/wide and must never be published or reused.
