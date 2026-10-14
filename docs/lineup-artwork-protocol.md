# Lineup artwork rules for every AI editor
These instructions apply to every new or edited lineup image: regular players, crutches, injury poses, trades, free agents and uniform changes. Follow them during creation; do not add publishing gates, evidence records or separate approval steps.

## Required inputs and proportions
Read assets/team-photos/STYLE_GUIDE.md, assets/ARTWORK_PROPORTIONS.md and assets/artwork-proportions.json before creating artwork. Use the current catalog as authoritative.
Use the actual approved full-body reference assets/team-photos/players/4047646-faces-v2.webp AND the player's official headshot as image inputs. When editing, also use the player's current approved body. Open the source references before generation; do not replace them with a text description.
Owner correction (October 14, evening): restore **16–17%**, with **16.5%** as the construction target, for hair-top-to-chin divided by visible hair-top-to-planted-soles height. This supersedes the 18% and 20% targets. Use `scripts/compose-player-artwork.py` and reusable player-specific head/body layers as described in `docs/lineup-artwork-protocol.md`. Preserve identity, natural shaded necks, body geometry, physical-height metadata and all lineup behavior. Another player is a style reference, never the numeric ruler.
Preserve athletic build, padded shoulders, torso/leg proportions, lighting, skin tone, hair, uniform and complete hands/cleats. Adding crutches, a box or another prop must not shrink the head or redesign the body.
Use the approved reference for body style during creation and use the composition command for head geometry. Including requirements in a prompt does not establish that the output follows them. Correct visible proportion/identity errors before using the asset; do not claim an inspection you did not perform.

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

## Consistent generation contract

The owner's October 14 evening correction restores **16–17%**, with **16.5%** as the construction target. Use the executable composition workflow below for new players and proportion edits. A prompt alone cannot set pixel geometry.

### Geometry and reference roles

Let T = top of hair, C = bottom of chin excluding neck, and S = bottom of planted soles, in the same registered source coordinate system. `r = (C-T)/(S-T)`. Exclude transparent margins, shadows, crutches and props. For body height below chin B = S-C, desired head height is `0.165 * B / 0.835`. The compositor scales the head equally on both axes around the chin, keeps the body fixed, then crops and resizes the entire result proportionally. An exactly 850px visible figure would have a 140.25px head; an 850px file can contain padding.

Use A.J. Brown's approved source for body style, pose and lighting. Use an official headshot for new likeness generation. Use the player's own source for edits. Use an approved same-status reference for status changes. No other player supplies the numeric ruler. Deterministic proportion corrections preserve existing identity pixels and do not require fresh headshot generation.

Physical height is a separate display concern: preserve verified `heightInches`. It controls relative resting size. Selected figures intentionally share a display target. Neither operation changes the head ratio. Catalog `ratio` means image width/height, not head/figure height.

### Reusable source files

Store each player's source in `assets/team-photos/sources/<playerId>/<variant>/`:

- `body.png`: transparent full source canvas with the original body, shaded neck and shoulders. A clean body for head reduction must contain the anatomy that the old larger head hid.
- `head.png`: transparent head layer registered on the SAME canvas. Include all hair and ears and a small natural neck overlap. Preserve the face's aspect ratio.
- `recipe.json`: layer paths, actual source landmarks, player ID, catalog variant and new versioned output name. These files are editable source material, not proof artifacts or a review manifest.

The five October 14 source recipes preserve the earlier bodies and identity pixels. Their landmark coordinates come from visual annotation at native resolution. The math is exact relative to those coordinates; anatomical placement remains approximate. Do not describe this as automatic chin detection or guaranteed exact anatomy. Do not copy a source's coordinates onto a differently generated player.

### Create or update in one command

Requires Python 3 and Pillow (`python -m pip install Pillow` if unavailable):

```sh
python scripts/compose-player-artwork.py assets/team-photos/sources/4429023/regular/recipe.json
```

Choose a new `output` filename in the recipe first. The command composes the layers at 16.5%, preserves alpha, crops using alpha >=128 plus two source pixels, exports an 850px-high WebP, and updates only that player's catalog file/dimensions/aspect ratio. It preserves existing physical heights, status metadata and other entries. It refuses to overwrite an existing image. Multiple recipe paths work in one invocation. Publish through the existing repository workflow afterwards; no separate browser run, inspection pass, test suite, proof file or approval round.

For uniform/status changes, edit the body layer only where needed and retain the head and landmarks. Do not feed a flattened output back into generation and assume its geometry survives. If a different pose changes the chin or sole position, register that variant's source coordinates once.

### New player: preparation during creation

Generate the player with the approved style reference and official headshot. Aim near the desired proportions, preserve the padded athletic build and natural neck, and keep the full figure transparent. Identify hair top, chin, chin center X and soles from THAT source once. This is the necessary anatomical input to construction; the generator prompt and alpha bounds cannot replace it.

For a source whose head needs enlargement, mark a polygon around the head/hair, excluding jersey and shoulders. The optional `--prepare` helper extracts reusable head/body layers from the source and composes in the same invocation. Keep a short feathered neck overlap. Include long hair carefully; avoid enclosing unrelated clothing. Existing source recipes demonstrate this input format.

```sh
python scripts/compose-player-artwork.py --prepare path/to/recipe.json
```

For a source whose head needs reduction, create a clean headless body with continuous natural neck/shoulders and an isolated head layer, using the image editor during source creation. Register both on the same canvas. A polygon cutout leaves holes when a large head shrinks; the helper intentionally does not use that method for reduction. Compose the clean layers without `--prepare`. Never fill missing anatomy with flat skin patches or scale the body to fake compliance.

Recipe shape for a NEW player (replace every example value with the actual source/player values):

```json
{
  "playerId": "ESPN_ID",
  "variant": "regular",
  "body": "body.png",
  "head": "head.png",
  "output": "ESPN_ID-faces-v1.webp",
  "landmarks": {"hairTopY": 4, "chinY": 135, "chinX": 165, "solesY": 846},
  "landmarkMethod": "Visually annotated in this player's own source; approximate",
  "newPlayer": {"name": "Player Name", "heightInches": 73, "teamId": 1, "jersey": "1"}
}
```

For extraction also supply `source`, `headPolygon` (array of [x,y] coordinates) and `neckBlendPixels` (normally 6). Paths are relative to the recipe. Use `variant: "unavailable"` for the existing unavailable catalog slot; retain its status metadata. For an existing player, omit `newPlayer`. New player metadata must come from a current official source; the example values are placeholders, not defaults.

Generate new visual content with the image-generation tool. Use this deterministic compositor for the owner-authorized geometry, layer assembly and packaging. Do not regenerate a whole person merely to change a percentage. Head width and the neck join also affect appearance; preserve identity and body anatomy rather than treating a correct vertical ratio as permission to distort them.
