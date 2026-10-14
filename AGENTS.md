# Repository instructions

Before ANY roster lineup code, styling or player artwork update, read `assets/team-photos/STYLE_GUIDE.md` and preserve all original requirements. Resting figures use relative real heights; selected figures intentionally share one enlarged size. Follow the owner's fast artwork workflow in docs/lineup-artwork-protocol.md; no separate artwork-only test pass or proof artifacts. Artwork updates require BOTH an approved full-body style reference and an official player headshot, followed by visual comparison. Do not treat passing numeric checks as proof of facial likeness.

Before ANY manager avatar or figure update, read `assets/MANAGER_ARTWORK_RULES.md`. Preserve the approved original bodies and exact geometry; an avatar change updates the head only, never regenerates the body.

Before ANY manager or player image update, read `assets/ARTWORK_PROPORTIONS.md` and `assets/artwork-proportions.json`. Use the named original image templates and existing saved comparisons; do not guess proportions from prose. Facial landmark estimates are explicitly approximate; canvas/alpha dimensions are measured. Preserve visible shaded necks and inspect enlarged joins before publishing.

Before ANY top-carousel / Wire card update, read `docs/wire-card-rules.md` and `docs/wire-live.md`. Preserve shared sizing, expansion, scrolling, gestures and refresh behavior. An approved card design does not waive those rules. Compare desktop and mobile cards against an existing ordinary card before publishing.

## All AI editors: lineup artwork
Read docs/lineup-artwork-protocol.md before EVERY lineup artwork generation or edit, including crutches and all alternate poses. Follow proportion/identity rules during creation, not only in the prompt. The owner forbids new publishing gates, recorded review evidence and extra approval steps. This protocol supersedes conflicting older workflow requirements for separate proof files and artwork-only test runs.

## Hard rule: circular player headshots
Every circular NFL player avatar must follow the existing roster and Wire player avatar treatment: use `object-fit: cover` with centered positioning so the jersey/bust reaches the circle's bottom edge. Never use `object-fit: contain` for a human headshot in a circle; it exposes a flat rectangular bust edge and an empty crescent underneath. Preserve the established avatar size, proportions and surrounding layout. Apply this rule to new cards, expanded cards, mobile and desktop. NFL team/DST logos are the exception: retain `object-fit: contain` so the full logo remains visible. Reuse the existing player-avatar styling instead of introducing a different crop.

## Player head size — owner correction (October 14)
For all future new or revised NFL player lineup artwork, target hair-top-to-chin head height at approximately 18% of the full visible figure height. This replaces both the older 16–17% guide and the rejected 20% target. Use the approved body reference for body style, pose and lighting, but do not copy its older smaller head scale. Scale the head uniformly, preserve identity and a natural shaded neck. This rule does not change manager artwork or global lineup sizing.

## Visible crop rule — October 14 lineup-gap correction
For every new or revised human lineup asset, compute the crop from visible alpha (opacity >=128), not alpha >0: nearly invisible generator noise must never determine canvas width. Keep two source pixels of edge padding, retain antialiasing within that crop, resize proportionally to 850px high, and set catalog width, height and ratio from the resulting file. Use new versioned filenames. Apply the same packaging to regular, crutch and free-agent variants. Never compensate for padded images with global spacing, negative margins, distorted bodies or physical-height changes. This is an asset-preparation rule, not a publishing check.

## Owner instruction: no publishing checks
The owner explicitly forbids publishing checks, automated publishing gates, mandatory test/inspection passes, proof artifacts and extra approval rounds. Do not add them or make publishing conditional on them. Apply these artwork rules while doing the requested work, then publish. This supersedes older conflicting check/proof instructions in this repository.

Head percentage reporting: A generation prompt's requested ratio is not a measured result. Use hair-top-to-chin divided by visible hair-top-to-soles height; exclude neck, transparent margins and shadows. Anatomical landmarks are approximate, so label reported values approximate. Never label an output 18% or 20% merely because that number was in its prompt. The October 14 Mevis drafts labeled 20% and 18% were rejected and must not become proportion references.
