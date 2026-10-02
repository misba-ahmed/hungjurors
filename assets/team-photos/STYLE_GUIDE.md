# Player lineup artwork — mandatory style reference

For every new player or revised lineup figure:
1. Read this file BEFORE generating. Use TWO visual references: an approved existing full-body lineup asset for body style, pose, framing, lighting and proportions, plus the player's current official headshot for identity. A headshot alone is not sufficient.
2. Approved body reference: `players/4047646-faces-v2.webp`. Match the established athletic, padded full-body cutout style, readable head size, front-facing stance, arms beside thighs, and feet apart. Do not substitute a slimmer, fashion-model or differently stylized figure.
3. Preserve the player's own face, hair and skin tone. Match exposed limbs to their skin tone. Verify current team and jersey number. Keep the whole head, hands and cleats.
4. Produce a transparent, tightly cropped WebP at 850px high. Keep catalog width/height/ratio accurate and real heightInches metadata consistent.
5. Before publication, visually compare the finished transparent cutout beside an approved player at the SAME rendered height. Check head/body proportions, shoulder width, pose, lighting, edges and uniform. Fix mismatches before shipping.
6. Use a new versioned filename to prevent stale cached artwork. Update only that player's catalog entry and preserve all other entries and unavailable variants.
7. For injury/status poses, retain the approved regular image and the status-driven restoration behavior. Preserve visual style and identity in the alternate pose.

Romeo Doubs faces-v2 was rejected because it was generated from a headshot without a full-body style reference. Do not use it as a reference. faces-v3 replaces it.

## Original lineup behavior — preserve on every update

These are existing user requirements, not new design choices. Later explicit user corrections take precedence.

- RESTING figures: use verified individual heightInches; preserve height ratios on a common baseline. Never normalize resting players to equal height. Catalog pixel height (850) is resolution, not listed physical height.
- SELECTED figures: all use the SAME enlarged target size, independent of physical height. Current size is 75% of the original enlarged target. Keep final-size image rendering sharp; do not stretch a low-resolution composited layer.
- Starting players stand only a tad forward (existing 5% perspective treatment) with gold glow. Keep the glow unclipped. No added starter labels.
- Tap, mouse hover and sliding a finger across the row select/cascade smoothly. Keep stable hit targets, keyboard navigation, vertical page scrolling and pinch zoom.
- Expand space only for selection. Leave only a small gap above/below, not a large empty block. Scores reserve NO top space and may overlap above.
- Show live and final actual fantasy scores; hide pregame/missing scores. Preserve prior-week scores until Thursday and automatic refresh.
- Player names use normal capitalization. Only the NAME opens the player card.
- Current roster membership controls displayed players. Preserve regular images and status-specific crutches/front-handcuff assets; restore regular images when healthy and active.
- Keep matchup sticky above the lineup at mobile widths; preserve roster/matchup swipe transitions, circular navigation and nested gesture ownership.

## Required update checks

Run `node scripts/test-lineup-rules.mjs`, `node scripts/test-lineup-status.mjs` and `node scripts/test-lineup-live-scores.mjs`. For interaction/sizing changes also run `node scripts/test-lineup-spotlight.mjs` and `node scripts/test-roster-swipe.mjs` with Playwright available.
For new assets, verify official heights and update `height-reference.json`; `scripts/audit-lineup-assets.mjs` checks every catalog entry against ESPN and image metadata. Review the visual proof as required above; automated checks cannot prove facial likeness or artistic consistency.
