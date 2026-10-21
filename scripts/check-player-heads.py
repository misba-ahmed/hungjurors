#!/usr/bin/env python3
"""Measure head size on player lineup artwork and gate it against the approved band.

Optional audit. New figures are finalized by scripts/fit-player-head.py (one
generation, head rescaled to the band deterministically); this script only
reports the same numbers, e.g. to audit the catalog or a single file.

Usage
  python3 scripts/check-player-heads.py IMAGE [IMAGE ...]
      Prints the measurements and PASS/FAIL per image (exit status 1 on any FAIL).
  python3 scripts/check-player-heads.py IMAGE --proof out.png [--reference FILE]
      Also writes the required visual proof: the figure beside the reference at
      equal height plus enlarged head crops.
  python3 scripts/check-player-heads.py --catalog
      Measures every regular figure in assets/team-photos/catalog.json.

Measurements (all as a percentage of the figure's visible height, alpha >= 128)
  head   hair top (first opaque row) to chin (bottom of the detected face box)
  face   detected face box height (brow to chin), hair-independent
  width  detected face box width

Rule (same as scripts/fit-player-head.py): head 15.2-16.2 (fit target 15.7);
above that only for big hair on a normal face (head <= 21.0, face <= 14.6).
"head" is the number the league owner asks for; "face" tells hair from a big
head.

Needs numpy, Pillow and opencv-python >= 4.5.4 (cv2.FaceDetectorYN). The face
model is assets/references/models/face_detection_yunet_2023mar.onnx (OpenCV
Zoo, Apache-2.0). No network access is required.
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, 'assets/references/models/face_detection_yunet_2023mar.onnx')
PLAYERS = os.path.join(ROOT, 'assets/team-photos/players')
DEFAULT_REFERENCE = os.path.join(PLAYERS, '4262921-faces-v2.webp')  # Justin Jefferson, head 15.7%
HEAD_BAND = (15.2, 16.2)   # hair-top-to-chin, % of figure height (fit target 15.7)
HAIR_MAX = 21.0            # above the band only for big hair on a normal face
HAIR_FACE_MAX = 14.6       # brow-to-chin (catalog p90); a bigger face over the band is a big head, not hair

def detector():
    import cv2
    if not hasattr(cv2, 'FaceDetectorYN'):
        sys.exit('opencv-python >= 4.5.4 with cv2.FaceDetectorYN is required')
    return cv2, cv2.FaceDetectorYN.create(MODEL, '', (320, 320), 0.5, 0.3, 5000)

def load(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    alpha = a[:, :, 3] >= 128
    rows = np.where(alpha.any(1))[0]
    cols = np.where(alpha.any(0))[0]
    if not len(rows):
        raise ValueError('image is fully transparent')
    return im, a, alpha, (int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1)

def measure(path, cv2=None, det=None):
    if det is None:
        cv2, det = detector()
    im, a, alpha, (x0, top, x1, bottom) = load(path)
    H = bottom - top
    rgb = a[:, :, :3].copy()
    rgb[~alpha] = (245, 240, 230)
    crop = rgb[top:top + int(H * 0.3)]
    s = max(1.0, 600 / crop.shape[0])
    big = cv2.cvtColor(cv2.resize(crop, None, fx=s, fy=s), cv2.COLOR_RGB2BGR)
    det.setInputSize((big.shape[1], big.shape[0]))
    _, faces = det.detect(big)
    if faces is None or not len(faces):
        return {'file': path, 'height': H, 'error': 'no face detected in the top 30% of the figure'}
    fx, fy, fw, fh = (max(faces, key=lambda f: f[2] * f[3])[:4] / s)
    chin = top + fy + fh
    res = {'file': path, 'height': H, 'width_px': x1 - x0,
           'head': round(float(100 * (chin - top) / H), 1),
           'face': round(float(100 * fh / H), 1),
           'width': round(float(100 * fw / H), 1),
           'box': (int(x0 + 0), int(top), int(fx), int(top + fy), int(fw), int(fh))}
    res['pass'] = not head_notes(res)
    return res

def verdict(r):
    if 'error' in r:
        return 'FAIL  ' + r['error']
    notes = head_notes(r)
    hair = not notes and r['head'] > HEAD_BAND[1]
    return ('PASS' if r['pass'] else 'FAIL') + ('  ' + '; '.join(notes) if notes else '  big hair, normal face' if hair else '')

def head_notes(r):
    """Same rule as scripts/fit-player-head.py: hair-top-to-chin in the band, or
    above it only by hair (face no bigger than normal, at most HAIR_MAX)."""
    head, face = r['head'], r['face']
    if head < HEAD_BAND[0]:
        return [f'head {head}% is below {HEAD_BAND[0]}% (too small)']
    if head > HAIR_MAX:
        return [f'head {head}% is above {HAIR_MAX}% (too big)']
    if head > HEAD_BAND[1] and face > HAIR_FACE_MAX:
        return [f'head {head}% is above {HEAD_BAND[1]}% with a big face ({face}%) (too big)']
    return []

def proof(candidate, reference, out, rc, rr):
    """Candidate beside reference at equal figure height, plus head crops taken
    at that same scale (a fixed window, so a smaller head looks smaller)."""
    H = 700
    WIN = (190, 200)  # crop window in pixels of the 700px-tall figure
    panels = []
    for path, r, label in ((reference, rr, 'approved reference'), (candidate, rc, 'candidate')):
        im = Image.open(path).convert('RGBA')
        im = im.crop(im.getbbox())
        s = H / im.height
        fig = im.resize((max(1, int(im.width * s)), H), Image.LANCZOS)
        cx = (r['box'][2] + r['box'][4] / 2 - r['box'][0]) * s if 'box' in r else fig.width / 2
        left = int(max(0, min(fig.width - WIN[0], cx - WIN[0] / 2)))
        head = fig.crop((left, 0, left + WIN[0], WIN[1])).resize((WIN[0] * 2, WIN[1] * 2), Image.LANCZOS)
        panels.append((fig, head, label, r))
    colw = max(max(p[0].width, WIN[0] * 2) for p in panels) + 40
    canvas = Image.new('RGBA', (colw * len(panels) + 20, H + WIN[1] * 2 + 140), (250, 245, 235, 255))
    d = ImageDraw.Draw(canvas)
    x = 20
    for fig, head, label, r in panels:
        canvas.alpha_composite(fig, (x, 30))
        canvas.alpha_composite(head, (x, H + 70))
        d.text((x, 10), f"{label}: head {r.get('head', '?')}%  face {r.get('face', '?')}%  width {r.get('width', '?')}%", fill=(0, 0, 0, 255))
        d.text((x, H + 50), 'head at the same figure scale (2x)', fill=(0, 0, 0, 255))
        x += colw
    y = H + WIN[1] * 2 + 85
    d.text((20, y), f"band: head {HEAD_BAND[0]}-{HEAD_BAND[1]}% (fit 15.7); up to {HAIR_MAX}% for big hair with face <= {HAIR_FACE_MAX}%", fill=(0, 0, 0, 255))
    d.text((20, y + 18), 'verdict: ' + verdict(rc), fill=(0, 0, 0, 255))
    canvas.save(out)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('images', nargs='*')
    ap.add_argument('--catalog', action='store_true', help='measure every regular catalog figure')
    ap.add_argument('--proof', help='write a side-by-side proof PNG (single image)')
    ap.add_argument('--reference', default=DEFAULT_REFERENCE, help='approved figure for the proof')
    ap.add_argument('--json', action='store_true', help='print JSON instead of text')
    args = ap.parse_args()
    cv2, det = detector()
    paths = list(args.images)
    if args.catalog:
        cat = json.load(open(os.path.join(ROOT, 'assets/team-photos/catalog.json')))
        paths += [os.path.join(PLAYERS, e['file']) for e in cat.values()]
    if not paths:
        ap.error('give at least one image or --catalog')
    results = [measure(p, cv2, det) for p in paths]
    if args.json:
        print(json.dumps(results, indent=1, default=str))
    else:
        for r in results:
            name = os.path.basename(r['file'])
            if 'error' in r:
                print(f'{name:40} {verdict(r)}')
            else:
                print(f"{name:40} head {r['head']:5.1f}%  face {r['face']:5.1f}%  width {r['width']:5.1f}%  {verdict(r)}")
    if args.proof:
        if len(args.images) != 1:
            ap.error('--proof needs exactly one candidate image')
        rr = measure(args.reference, cv2, det)
        proof(args.images[0], args.reference, args.proof, results[0], rr)
        print('proof written to', args.proof)
    sys.exit(0 if all(r.get('pass') for r in results) else 1)

if __name__ == '__main__':
    main()
