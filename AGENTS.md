# Repository instructions

## Lineup artwork (every AI editor)
Read `docs/lineup-artwork-protocol.md` before EVERY player lineup artwork generation or edit, including crutches and all alternate poses. It is the only workflow: generate ONCE (Justin Jefferson reference + official headshot) → `python3 scripts/fit-player-head.py GENERATED.png OUT.webp` (sets head size, packages the 850px WebP) → catalog → publish. The owner forbids publishing checks, test passes for artwork-only updates, proof/comparison files, percentage reports and approval rounds. Older head-size targets, prompt-only constructions and measurement loops in this repository's history are superseded.

Before ANY roster lineup code or styling update, read `assets/team-photos/STYLE_GUIDE.md` and preserve all original requirements. Resting figures use relative real heights; selected figures intentionally share one enlarged size. Run the lineup checks before publishing code or styling changes (never for artwork-only updates).

Before ANY manager avatar or figure update, read `assets/MANAGER_ARTWORK_RULES.md`. Preserve the approved original bodies and exact geometry; an avatar change updates the head only, never regenerates the body.

Before ANY manager or player image update, read `assets/ARTWORK_PROPORTIONS.md` and `assets/artwork-proportions.json`. Use the named original image templates; do not guess proportions from prose. Preserve visible shaded necks. Manager artwork keeps its own rules; player figures are finalized by `scripts/fit-player-head.py` with no inspection or approval round.

Before ANY top-carousel / Wire card update, read `docs/wire-card-rules.md` and `docs/wire-live.md`. Preserve shared sizing, expansion, scrolling, gestures and refresh behavior. An approved card design does not waive those rules. Compare desktop and mobile cards against an existing ordinary card before publishing.

## Hard rule: circular player headshots
Every circular NFL player avatar must follow the existing roster and Wire player avatar treatment: use `object-fit: cover` with centered positioning so the jersey/bust reaches the circle's bottom edge. Never use `object-fit: contain` for a human headshot in a circle; it exposes a flat rectangular bust edge and an empty crescent underneath. Preserve the established avatar size, proportions and surrounding layout. Apply this rule to new cards, expanded cards, mobile and desktop. NFL team/DST logos are the exception: retain `object-fit: contain` so the full logo remains visible. Reuse the existing player-avatar styling instead of introducing a different crop.

## Crutch artwork stance — owner correction October 14
Before generating or editing any status artwork, open an existing approved image of that SAME status. For crutches, use `assets/team-photos/players/4047646-crutches-v1.webp` as the pose reference in addition to the player's regular artwork and official headshot. Match the established upright standing pose: BOTH legs straight, BOTH normal cleats planted on the same baseline, with one silver underarm crutch on each side. Preserve the regular lower body and add crutches; only adjust hands to hold the grips. Never lift a foot, bend a knee backward, invent a hopping/one-leg stance, cast, boot or missing limb unless the owner explicitly requests it. The October 14 Montgomery, Deebo Samuel, Shipley and Henderson crutches-v1/v2 poses were rejected; do not use them as references. Their crutches-v3 replacements restore the established pose. Read and use existing section artwork BEFORE creating new artwork. The no-publishing-checks instruction does not waive this preparation rule; no new publication gate or proof artifact is required.

