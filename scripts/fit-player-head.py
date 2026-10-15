#!/usr/bin/env python3
"""Make a generated lineup figure's head the approved size, deterministically.

One generation, no re-rolls: the image generator is asked for the right
proportions, and whatever it returns is measured here and, if the head is
outside the band, the head+neck is rescaled about the collar point toward the
target (15.7% of figure height, chosen by eye by the league owner), limited so
the face never gets wider than 0.29x the shoulders and never more than 15% in
one pass: a head that is tall enough but too wide for its shoulders reads as a
bobblehead. The result is
re-cropped and written out at the catalog resolution (850px high, WebP,
transparent). Nothing else changes: body, pose, uniform, colours.

Usage
  python3 scripts/fit-player-head.py IN.png OUT.webp
    exit 0: written (head was already in band, or fitted); prints the numbers
    exit 2: no face found (regenerate; this is the only case that needs one)

Needs numpy, Pillow, opencv-python >= 4.5.4 (cv2.FaceDetectorYN).
"""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, 'assets/references/models/face_detection_yunet_2023mar.onnx')
BAND = (15.2, 16.2)      # accepted hair-top-to-chin, % of figure height
TARGET = 15.7            # fitted toward this when outside the band (league owner picked it by eye, Oct 15 2026)
MAX_FACE_TO_SHOULDER = 0.29  # face width / shoulder width; catalog median 0.285. Above ~0.31 reads as a bobblehead.
MAX_SCALE = 1.15         # never blow a head up more than this in one go
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

def fit(im, m, target):
    """Scale head+neck about the collar point so head% == target."""
    a = np.array(im)
    H = m['H']; top = m['top']
    h = m['chin'] - top; t = target / 100
    f = t * (H - h) / (h * (1 - t))                         # head' / (H + growth) == target
    # A head that is tall enough but too wide for its shoulders looks like a
    # bobblehead, so the width limit and the per-pass cap win over the height target.
    f = min(f, MAX_FACE_TO_SHOULDER / max(1e-6, m['face_to_shoulder']), MAX_SCALE)
    f = max(f, 1.0 / MAX_SCALE)
    cx = m['fx'] + m['fw'] / 2
    neck_base = m['chin'] + 0.32 * m['fh']                 # about the collar line
    half = 0.85 * m['fw']                                   # neck/jaw span to carry along below the chin
    # Head layer: everything above the chin, plus the neck column below it, feathered at the collar.
    layer = np.zeros_like(a)
    y0 = max(0, int(top - 2)); y1 = int(round(neck_base))
    layer[y0:y1] = a[y0:y1]
    cols = np.arange(a.shape[1])
    below = np.zeros_like(layer[:, :, 3], dtype=bool)
    below[int(m['chin']):y1, :] = np.abs(cols - cx)[None, :] > half
    layer[below] = 0
    feather = max(4, int(0.12 * m['fh']))
    ramp = np.linspace(1, 0, feather)
    for i, w in enumerate(ramp):
        r = y1 - feather + i
        if 0 <= r < layer.shape[0]:
            layer[r, :, 3] = (layer[r, :, 3] * w).astype(np.uint8)
    head = Image.fromarray(layer)
    new_w, new_h = int(round(head.width * f)), int(round(head.height * f))
    head_s = head.resize((new_w, new_h), Image.LANCZOS)
    # Anchor: (cx, neck_base) maps to itself.
    off = (int(round(cx - cx * f)), int(round(neck_base - neck_base * f)))
    # Erase the original head above the chin (the scaled head covers it) and paste.
    body = a.copy()
    body[y0:int(m['chin']), :, :] = 0
    canvas_top = min(0, off[1])
    canvas = Image.new('RGBA', (a.shape[1], a.shape[0] - canvas_top), (0, 0, 0, 0))
    canvas.alpha_composite(Image.fromarray(body), (0, -canvas_top))
    canvas.alpha_composite(head_s, (off[0], off[1] - canvas_top))
    return canvas, f

def finish(im):
    """Tight crop and 850px height, like every catalog asset."""
    im = im.crop(im.getbbox())
    s = OUT_HEIGHT / im.height
    return im.resize((max(1, int(round(im.width * s))), OUT_HEIGHT), Image.LANCZOS)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input'); ap.add_argument('output')
    ap.add_argument('--target', type=float, default=TARGET)
    ap.add_argument('--force', action='store_true', help='fit even when already inside the band')
    args = ap.parse_args()
    im = Image.open(args.input).convert('RGBA')
    m = detect(np.array(im))
    if not m:
        print('no face detected; regenerate the figure'); sys.exit(2)
    before = m['head']
    fitted = False; f = 1.0
    if args.force or not (BAND[0] <= before <= BAND[1]):
        im, f = fit(im, m, args.target); fitted = True
    out = finish(im)
    m2 = detect(np.array(out))
    out.save(args.output, quality=92, method=6) if args.output.lower().endswith('.webp') else out.save(args.output)
    print(f"head {before:.1f}% -> {m2['head'] if m2 else float('nan'):.1f}%  face {m2['face'] if m2 else 0:.1f}%  width {m2['width'] if m2 else 0:.1f}%  face/shoulder {m['face_to_shoulder']:.3f} -> {m2['face_to_shoulder'] if m2 else 0:.3f}  {'fitted x%.3f' % f if fitted else 'already in band'}  {out.width}x{out.height} -> {args.output}")

if __name__ == '__main__':
    main()
