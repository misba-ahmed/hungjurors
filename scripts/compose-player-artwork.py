#!/usr/bin/env python3
"""Compose reusable player layers at the owner's 16.5% head target.
Requires Pillow. Paths in recipes are relative to the recipe directory.
This is an asset creation command, not a site test or publishing gate.
"""
import argparse
import json
import math
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
TARGET = 0.165


def prepare(recipe_path, recipe):
    """Split an existing smaller-head source once; retain neck overlap.
    For a shrinking head, supply a clean headless body instead of this helper.
    """
    source = Image.open(recipe_path.parent / recipe['source']).convert('RGBA')
    marks = recipe['landmarks']
    scale = TARGET * (marks['solesY'] - marks['chinY']) / ((1 - TARGET) * (marks['chinY'] - marks['hairTopY']))
    if scale < 1:
        raise ValueError('Extraction cannot reveal anatomy hidden by a larger head. Supply a clean body layer and head layer, then compose without --prepare.')
    mask = Image.new('L', source.size, 0)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in recipe['headPolygon']], fill=255)
    # Keep the source neck under a short feathered join; never synthesize flat skin.
    join = recipe.get('neckBlendPixels', 6)
    pixels = mask.load()
    chin = marks['chinY']
    for y in range(chin, min(source.height, chin + join)):
        for x in range(source.width):
            pixels[x, y] = round(pixels[x, y] * (chin + join - y) / join)
    # Long hair below this join can remain opaque where the polygon includes it.
    head = source.copy()
    head.putalpha(ImageChops.multiply(source.getchannel('A'), mask))
    removal = mask.point(lambda value: 255 if value == 255 else 0)
    body = source.copy()
    body.putalpha(ImageChops.multiply(source.getchannel('A'), ImageChops.invert(removal)))
    head.paste((0, 0, 0, 0), mask=head.getchannel('A').point(lambda a: 255 if a == 0 else 0))
    body.paste((0, 0, 0, 0), mask=body.getchannel('A').point(lambda a: 255 if a == 0 else 0))
    head.save(recipe_path.parent / recipe['head'])
    body.save(recipe_path.parent / recipe['body'])


def compose(recipe_path, recipe):
    body = Image.open(recipe_path.parent / recipe['body']).convert('RGBA')
    head = Image.open(recipe_path.parent / recipe['head']).convert('RGBA')
    if head.size != body.size:
        raise ValueError('Register head and body layers on the same source canvas.')
    m = recipe['landmarks']
    top, chin, soles, x = (m[k] for k in ('hairTopY', 'chinY', 'solesY', 'chinX'))
    if not top < chin < soles:
        raise ValueError('Identify actual hair-top, chin and planted-sole landmarks first.')
    scale = TARGET * (soles - chin) / ((1 - TARGET) * (chin - top))
    # Affine transform scales both axes by precisely the same factor about the chin.
    margin = math.ceil(max(body.size) * max(1, scale))
    size = (body.width + 2 * margin, body.height + 2 * margin)
    canvas = Image.new('RGBA', size)
    canvas.alpha_composite(body, (margin, margin))
    transform = (1 / scale, 0, x - (x + margin) / scale,
                 0, 1 / scale, chin - (chin + margin) / scale)
    # Premultiplied alpha prevents dark/colored fringes around the cutout.
    moved = head.convert('RGBa').transform(size, Image.Transform.AFFINE, transform,
                                           resample=Image.Resampling.BICUBIC).convert('RGBA')
    canvas.alpha_composite(moved)
    bounds = canvas.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
    if not bounds:
        raise ValueError('Layers contain no visible figure.')
    left, upper, right, lower = bounds
    crop = (max(0, left - 2), max(0, upper - 2), min(size[0], right + 2), min(size[1], lower + 2))
    canvas = canvas.crop(crop)
    output_size = (round(canvas.width * 850 / canvas.height), 850)
    canvas = canvas.convert('RGBa').resize(output_size, Image.Resampling.LANCZOS).convert('RGBA')
    output = ROOT / 'assets/team-photos/players' / recipe['output']
    if output.exists():
        raise FileExistsError('Choose a new versioned output filename: ' + str(output))
    canvas.paste((0, 0, 0, 0), mask=canvas.getchannel('A').point(lambda a: 255 if a == 0 else 0))
    encoded = BytesIO()
    canvas.save(encoded, 'WEBP', lossless=True, method=6)
    payload = encoded.getvalue()
    if not payload:
        raise RuntimeError('WebP encoder returned no image bytes.')
    output.write_bytes(payload)
    catalog_path = ROOT / 'assets/team-photos/catalog.json'
    catalog = json.loads(catalog_path.read_text())
    player_id = str(recipe['playerId'])
    if player_id not in catalog:
        # New players must supply their own verified metadata; never default physical height.
        metadata = recipe['newPlayer']
        for key in ('name', 'heightInches', 'teamId', 'jersey'):
            if key not in metadata:
                raise ValueError('New player needs ' + key)
        catalog[player_id] = metadata.copy()
    entry = catalog[player_id]
    if recipe.get('variant') == 'unavailable':
        entry = entry.setdefault('unavailable', {})
    elif recipe.get('variant', 'regular') != 'regular':
        raise ValueError('Supported catalog variants: regular, unavailable.')
    entry.update(file=output.name, width=canvas.width, height=canvas.height,
                 ratio=round(canvas.width / canvas.height, 5))
    catalog_path.write_text(json.dumps(catalog, indent=2) + '\n')
    new_top = chin + (top - chin) * scale
    print(f'{output.relative_to(ROOT)}: composed at {100 * (chin-new_top)/(soles-new_top):.2f}% from annotated landmarks; source head scale {scale:.5f}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('recipes', nargs='+', type=Path)
    parser.add_argument('--prepare', action='store_true', help='One-time layer extraction from a smaller-head source using its headPolygon.')
    args = parser.parse_args()
    for path in args.recipes:
        recipe = json.loads(path.read_text())
        if args.prepare:
            prepare(path, recipe)
        compose(path, recipe)


if __name__ == '__main__':
    main()
