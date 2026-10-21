# Lineup artwork: the one workflow (October 15, 2026)

This file is the only head-size and workflow rule for player lineup figures. It replaces every earlier head-size rule, target, reference choice, prompt-only construction, measurement loop, "check and correct" step and the withdrawn October 14 polygon-cutout compositor. Those are history; do not revive them.

The league owner's requirements: fast, cheap in generation credits, no approval rounds, no proof files, no test passes, no publishing gates. One generation per figure, then publish.

## Why a script sets the head size
Image generators cannot hold a head-to-body ratio on request. Every first generation since October 7 came out small-headed (measured 14.2–15.3% hair-top-to-chin over figure height; the owner's size is 15.7%), whatever the prompt said, including the "+15% larger head" instruction and the Drake Maye reference. Re-rolling costs credits and still misses. So the generated image is measured and its head is set deterministically by `scripts/fit-player-head.py`, which the owner approved after picking 15.7% by eye from a five-size strip produced by that script.

## The workflow for a new or revised figure
1. **Inputs:** the approved body reference `assets/team-photos/players/4262921-faces-v2.webp` (Justin Jefferson, measured head 15.7%) and the player's official ESPN headshot. Verify team, jersey number and `heightInches` from the existing sources.
2. **Generate once** with the prompt below. Do not generate a second version for head size.
3. **Fit and package:** `python3 scripts/fit-player-head.py GENERATED.png assets/team-photos/players/<id>-faces-vN.webp` (new versioned filename). The script measures the head and scales the whole head+neck about the collar, both ways: a head under the band is enlarged toward 15.7% (at most +15%, never wider than 0.32× the shoulders); a head over the band is shrunk only when the face itself is big (over 14.6%), never below a median face; a head over the band from big hair on a normal face (up to 21%) is kept. Only the head is scaled, anchored at the chin and faded into the real neck a quarter face-height below it; the jersey collar, shoulders and hanging locs below the chin are never scaled. It applies the visible-alpha crop rule and writes the 850px WebP. Exit code 2 (no face found) is the only case that calls for a regeneration.
4. **Catalog:** add the entry (width, height, ratio from the written file; verified `heightInches`), keeping other entries and variants intact.
5. **Publish.** Say which player was added or updated. No percentage report, no comparison image, no test run, no approval request.

Status variants (crutches, free agent, trade) use the player's intact regular image as the edit target plus the same-status pose reference in the crutch rule below, then go through step 3 as well.

## Prompt
> Create one full-body lineup cutout of [PLAYER], using image 1 (the approved Justin Jefferson figure) as the visual template for head/body balance, athletic padded build, front-facing stance, relaxed arms beside the thighs, feet apart, natural neck length and photographic lighting. Image 2 is [PLAYER]'s official headshot: use that player's face, adult jaw shape, hair, beard, eyes and skin tone. [PLAYER] wears [VERIFIED TEAM UNIFORM], jersey [NUMBER]. Make the head slightly larger than realistic, about 16% of the total figure height from hair top to chin, like a stylized sports collectible, with the head, shaded neck, collar and shoulders rendered as one continuous form. Show all hair, hands and cleats; both cleats planted on the same baseline. True alpha transparency with a small margin, whole figure sharp. No helmet, props, labels, extra figures, enlarged eyes or toy styling.

## Rules that stay
- **Crutch stance (owner correction, October 14):** open an existing approved image of the same status first. Crutch pose reference: `assets/team-photos/players/4047646-crutches-v1.webp`. Both legs straight, both normal cleats planted on the same baseline, one silver underarm crutch each side; keep the regular lower body, only adjust the hands to hold the grips. Never a lifted foot, bent-back knee, hop, cast, boot or missing limb unless the owner asks. The October 14 Montgomery, Deebo Samuel, Shipley and Henderson crutches-v1/v2 poses were rejected; their v3 replacements are the pattern.
- **Visible crop rule (October 14):** crop by visible alpha (opacity ≥128), two source pixels of padding, antialiasing kept inside, 850px high, catalog width/height/ratio from the file, new versioned filenames. `fit-player-head.py` does this for you.
- **Circular player avatars** on the site use `object-fit: cover`; team/DST logos use `contain` (see AGENTS.md).
- **Existing catalog figures** are not regenerated or re-fitted because of the number; this workflow is for new and revised figures the owner asks for.
- **Lineup behavior:** resting figures use verified individual `heightInches`; selected figures share one enlarged size; status restoration, bye/free-agent tint, scores and interactions stay as documented in `assets/team-photos/STYLE_GUIDE.md`. Mascots are separate.

## Numbers (for reference, not for reporting)
Head = hair top to chin over visible figure height; face = brow to chin. Band 15.2–16.2%, fit target 15.7%. Over the band is accepted only as big hair on a normal face (face ≤ 14.6%, head ≤ 21%). Face width ≤ 0.32× shoulder width when enlarging (catalog median 0.285). Jefferson 15.7% / face 13.7%. `scripts/check-player-heads.py` audits the same rule on demand (`--catalog`); it is not part of an update.

October 21 fix: the first version only ever enlarged, so over-sized generations were published untouched, and its 0.29 face/shoulder limit (below the catalog median) stopped most small heads from being enlarged; it also enlarged big-hair heads to 18%+ because of a face floor. The check script failed almost every figure because it demanded head, face and width bands that big hair makes contradictory. The first version also scaled a wide neck column down to the collar line and pasted it over the body, which drew a second, larger collar over the real one and cut hanging locs at the chin; Cooper Jr., Fitzgerald and Tyson were re-packaged from their original generations.
