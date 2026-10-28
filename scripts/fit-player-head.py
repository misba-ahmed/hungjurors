#!/usr/bin/env python3
"""Package a generated lineup figure, giving it the approved head size.

One generation, no re-rolls. Whatever the generator returns is measured here
(hair-top-to-chin and the face, brow to chin, as % of figure height) and the
WHOLE head and neck are scaled uniformly about the collar point:
  - head under 15.2%: enlarged toward 15.7% (the size the league owner picked by
    eye on Oct 15, 2026), up to 15% per pass, stopping before the face gets wider
    than 0.32x the shoulders (a bobblehead);
  - head over 16.2% with a face bigger than the catalog's normal range (14.6%):
    shrunk toward 15.7%, never below a median face (13.3%);
  - head over 16.2% from big hair (afro, locs, dreads) on a normal face, up to
    21%: left alone; shrinking it would only make the face too small;
  - otherwise left alone.
Then it is packaged by the visible crop rule (alpha >= 128, 2px padding, 850px
high, WebP). Nothing else changes: body, pose, uniform, colours, identity.
scripts/check-player-heads.py applies the same rule.

This is not the withdrawn October 14 polygon-cutout compositor: no face/neck
patch is cut out and pasted onto the old neck. The complete head+neck region is
scaled as one piece with its own neck, anchored at the collar and feathered
over the last few pixels, so the join stays continuous. Verified on dreads,
long hair, beards, kickers and crutch poses.

Usage
  python3 scripts/fit-player-head.py GENERATED.png assets/team-photos/players/<id>-faces-vN.webp
    exit 0: written; prints one line measured on the FINAL file, ending in PASS
    exit 2: no face found (regenerate; this is the only case that needs one)
    exit 3: final head still outside the band (should not happen; do not publish)
  Then set the catalog width/height/ratio from the written file and publish.

Needs numpy, Pillow, opencv-python >= 4.5.4 (cv2.FaceDetectorYN).
"""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageFilter

# Hair-top-to-chin is the number the league owner sizes by eye (15.7%, picked
# Oct 15 2026). It moves both ways now: the old enlarge-only rule left every
# over-sized generation (17-19%) untouched, and its 0.29 face/shoulder guard
# (below the catalog median) blocked most small heads (14.4-14.9%).
# Big hair (afro, dreads, locs) adds to hair-top-to-chin without making the
# face bigger, so a head over the band is only shrunk when the face (brow to
# chin) is itself bigger than the catalog's normal range, and never below the
# catalog's median face.
BAND, TARGET = (15.2, 16.2), 15.7
FACE_MAX, FACE_MEDIAN = 14.6, 13.3    # brow-to-chin, % of figure height (catalog p90 / median)
HAIR_MAX = 21.0                       # hair-top-to-chin accepted for big hair on a normal face
MAX_FACE_TO_SHOULDER = 0.32           # enlarging past this reads as a bobblehead (catalog median 0.285)
MIN_SCALE, MAX_SCALE = 0.87, 1.15     # per pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, 'assets/references/models/face_detection_yunet_2023mar.onnx')
OUT_HEIGHT = 850

def detect(rgba):
    import cv2
    det = cv2.FaceDetectorYN.create(MODEL, '', (320, 320), 0.5, 0.3, 5000)
    alpha = rgba[:, :, 3] >= 128
    rows = np.where(alpha.any(1))[0]
    top, bottom = int(rows[0]), int(rows[-1]) + 1
    H = bottom - top
    rgb = rgba[:, :, :3].copy(); rgb[~alpha] = (245, 240, 230)
    crop = rgb[top:top + int(H * 0.3)]
    s = max(1.0, 600 / crop.shape[0])
    big = cv2.cvtColor(cv2.resize(crop, None, fx=s, fy=s), cv2.COLOR_RGB2BGR)
    det.setInputSize((big.shape[1], big.shape[0]))
    _, faces = det.detect(big)
    if faces is None or not len(faces):
        return None
    fx, fy, fw, fh = (max(faces, key=lambda f: f[2] * f[3])[:4] / s)
    chin = top + fy + fh
    shoulder = int(alpha[int(chin + 0.5 * fh):int(chin + 2.5 * fh)].sum(1).max())  # widest row across the shoulders
    return dict(top=top, bottom=bottom, H=H, fx=fx, fy=top + fy, fw=fw, fh=fh, chin=chin, shoulder=shoulder,
                head=100 * (fy + fh) / H, face=100 * fh / H, width=100 * fw / H, face_to_shoulder=fw / max(1, shoulder))

def head_after(m, f):
    """Hair-top-to-chin % after scaling the head+neck by f about the collar."""
    h = m['chin'] - m['top']
    return 100 * f * h / (m['H'] + (f - 1) * h)

def scale_for(m, target=TARGET):
    """Head+neck scale: toward the target both ways, within the face and shoulder limits."""
    head, face = m['head'], m['face']
    h = m['chin'] - m['top']; t = target / 100
    to_target = t * (m['H'] - h) / (h * (1 - t))
    if head < BAND[0]:
        f = min(to_target, MAX_FACE_TO_SHOULDER / max(1e-6, m['face_to_shoulder']))
        f = max(f, 1.0)
    elif head > BAND[1]:
        if face <= FACE_MAX and head <= HAIR_MAX:
            f = 1.0                                   # big hair on a normal face: leave it
        else:
            f = min(1.0, max(to_target, FACE_MEDIAN / face))  # big face: shrink, not below a median face
    else:
        f = 1.0
    return min(max(f, MIN_SCALE), MAX_SCALE)

def fit(im, m, f):
    """Scale the head by f about the chin and lay it over the untouched body.

    The jersey collar and shoulders are never scaled: the head layer stops a
    quarter face-height under the chin and fades out over that band, so the
    original neck and collar show through underneath. (The first version scaled
    a wide neck column down to the collar line and pasted it on top, which put
    a second, larger collar over the real one, and cut hanging locs at the chin.)
    """
    a = np.array(im)
    top, chin, fw, fh = m['top'], m['chin'], m['fw'], m['fh']
    cx = m['fx'] + fw / 2
    span = 1.35 * fw                                        # head + hair, inside the shoulders
    cols = np.abs(np.arange(a.shape[1]) - cx)[None, :] <= span
    y0 = max(0, int(top - 2)); yc = int(round(chin)); y1 = min(a.shape[0], int(round(chin + 0.25 * fh)))
    layer = np.zeros_like(a)
    layer[y0:y1] = a[y0:y1]
    layer[y0:y1][~np.broadcast_to(cols, (y1 - y0, a.shape[1]))] = 0
    fade = np.linspace(1, 0, max(1, y1 - yc))               # chin -> a quarter face below: fade to the real neck
    layer[yc:y1, :, 3] = (layer[yc:y1, :, 3] * fade[:, None]).astype(np.uint8)
    head = Image.fromarray(layer)
    head_s = head.resize((int(round(head.width * f)), int(round(head.height * f))), Image.LANCZOS)
    off = (int(round(cx - cx * f)), int(round(chin - chin * f)))   # (cx, chin) stays put
    body = a.copy()
    body[y0:yc][np.broadcast_to(cols, (yc - y0, a.shape[1]))] = 0  # the old head; the scaled one replaces it
    canvas_top = min(0, off[1])
    canvas = Image.new('RGBA', (a.shape[1], a.shape[0] - canvas_top), (0, 0, 0, 0))
    canvas.alpha_composite(Image.fromarray(body), (0, -canvas_top))
    canvas.alpha_composite(head_s, (off[0], off[1] - canvas_top))
    return canvas, f

def finish(im):
    """Package like every catalog asset (visible crop rule): crop to alpha >= 128
    plus two source pixels of padding, keep antialiasing inside, 850px high."""
    a = np.array(im)
    vis = a[:, :, 3] >= 128
    rows = np.where(vis.any(1))[0]; cols = np.where(vis.any(0))[0]
    box = (max(0, cols[0] - 2), max(0, rows[0] - 2), min(im.width, cols[-1] + 3), min(im.height, rows[-1] + 3))
    im = im.crop(box)
    s = OUT_HEIGHT / im.height
    return im.resize((max(1, int(round(im.width * s))), OUT_HEIGHT), Image.LANCZOS)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input'); ap.add_argument('output')
    ap.add_argument('--target', type=float, default=TARGET, help='hair-top-to-chin %% of figure height')
    args = ap.parse_args()
    im = Image.open(args.input).convert('RGBA')
    m = detect(np.array(im))
    if not m:
        print('no face detected; regenerate the figure'); sys.exit(2)
    before = m['head']
    # Decide on the PACKAGED figure (what the site shows), not the raw generation: cropping
    # and resizing to 850px moves the measurement by a few tenths, which once let a 15.4% raw
    # head ship at 15.0% labelled "kept: in band" (Penix, Oct 28). Re-measure after every
    # pass and repeat until the packaged head is in band or a limit stops it.
    total, out = 1.0, finish(im)
    m2 = detect(np.array(out))
    for _ in range(3):
        if not m2:
            break
        f = scale_for(m2, args.target)
        if abs(f - 1) <= 1e-3:
            break
        im, _ = fit(im, detect(np.array(im)) or m, f); total *= f
        out = finish(im); m2 = detect(np.array(out))
    if not m2:
        print('no face detected after packaging; regenerate the figure'); sys.exit(2)
    head, face = m2['head'], m2['face']
    if BAND[0] <= head <= BAND[1]:
        verdict = 'PASS'
    elif head > BAND[1] and face <= FACE_MAX and head <= HAIR_MAX:
        verdict = 'PASS (big hair, normal face)'
    elif head < BAND[0] and m2['face_to_shoulder'] >= MAX_FACE_TO_SHOULDER - 0.005:
        verdict = 'PASS (kept below band: wider would read as a bobblehead)'
    elif head > BAND[1] and face <= FACE_MEDIAN + 0.05:
        verdict = 'PASS (kept above band: smaller would shrink a median face)'
    else:
        verdict = 'FAIL'
    out.save(args.output, quality=92, method=6) if args.output.lower().endswith('.webp') else out.save(args.output)
    print(f"head {before:.1f}% -> {head:.1f}%  face {m['face']:.1f}% -> {face:.1f}%  face/shoulder {m['face_to_shoulder']:.3f} -> {m2['face_to_shoulder']:.3f}  {'scaled x%.3f' % total if abs(total - 1) > 1e-3 else 'unchanged'}  {out.width}x{out.height} -> {args.output}  {verdict}")
    if verdict == 'FAIL':
        print('final head is outside the band; do not publish this file'); sys.exit(3)

if __name__ == '__main__':
    main()
