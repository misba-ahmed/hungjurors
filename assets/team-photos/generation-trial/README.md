# New-player generation experiment — October 14, 2026

The owner requested a practical test of stronger generation instructions for NEW roster players. This experiment creates new complete players. It does not resize existing heads, composite face layers, change the live catalog, or introduce a mandatory publishing review.

## Result

Six built-in image-generation calls produced five Isaac TeSlaa drafts and one Keaton Mitchell draft. Neither player had an existing asset in the catalog. This does not establish that either currently belongs to a fantasy roster. All images used the approved A.J. Brown style source, the individual's official ESPN headshot and an independent numerical diagram. The role/order of the references is stated in each exact prompt.

| Generation | Prompt treatment | Approximate head ratio |
| --- | --- | --- |
| TeSlaa 1 | Explicit 16.5% wording plus diagram as reference | 14.5% |
| TeSlaa 2 | Diagram as master composition, fixed hair/chin/sole coordinates | 14.5% |
| TeSlaa 3 | Six-head-tall illustration emphasis and feedback on undersizing | 15.7% |
| TeSlaa 4 | Stronger illustration-scale emphasis plus measured correction | 16.4% |
| Mitchell, first generation | Reusable wording with correction history removed | Not scored: beard obscures anatomical chin |
| TeSlaa, fresh generation | Same reusable wording, no prior-draft correction | 15.3% |

The fourth TeSlaa draft falls within the owner's range by approximate visual landmark measurement and has a continuous generated head/neck connection. The fresh repeat misses the range. This trial therefore does NOT demonstrate a reliable one-pass solution. Do not install its prompts as a guaranteed proportion-control mechanism. Exploratory prompts changed multiple details; these samples cannot isolate a causal factor or establish a general success rate.

## What the test supports

The generator can create an intact player within 16–17% without post-generation head edits. The observed successful example followed explicit whole-figure illustration-scale direction and measured feedback. Stronger percentage language and a numerical diagram alone did not produce the requested result in the first two samples. The diagram is a conditioning input, not a hard geometry constraint.

The best-performing exact prompt is `prompt-4.txt`; its output is `teslaa-trial-4.webp`. It includes feedback about an actual preceding draft. Do not fabricate that history for a new player. `prompt-6.txt` is the fresh-player version; its failed repeat is retained to prevent overstating the result. Preserve the owner’s actual 16–17% target; do not change it to compensate for a particular draft.

A bearded player's anatomical chin may be hidden. Do not choose a convenient point inside the beard to obtain a passing number. These six calls do not establish a dependable chin detector.

## Files and measurement

The `prompt*.txt` files contain the exact prompts submitted. All outputs are 1024 x 1536. The WebP files are quality-95 format copies; they retain the original pixel dimensions, composition and anatomy. No head scaling, warping, cropping, retouching or skin blending occurred. Original generated PNGs remain in the conversation's generated-image outputs.

`measurements.json` records visually identified hair-top, chin and sole coordinates. These are approximate anatomical annotations, not automated detections or exact anatomical ground truth. Ratios use `(chinY - hairTopY) / (solesY - hairTopY)`. Neck and padding are excluded. The final TeSlaa measurement used a close view of the chin; roughly 240px is the lower chin boundary.

Reference order for prompts 1, 3, 4, 5 and 6 is specified in their text; prompt 2 deliberately puts the numerical guide first. The common style source is `../players/4047646-faces-v2.webp`. Identity sources and verified physical heights are in `identity.json` and `mitchell-identity.json`. Physical height remains separate from head ratio and would control resting lineup size if these assets were integrated.

The guide defines a 1336px visible figure, hair top at y=100, chin near y=320.44 and planted soles at y=1436. It is a schematic dimensional input, not an anatomical model or another player's proportion reference.

This folder documents a one-time development test requested by the owner. It adds no routine site checks, proof requirements, CI jobs or approval rounds. Production artwork and instructions remain unchanged by this experiment branch.
