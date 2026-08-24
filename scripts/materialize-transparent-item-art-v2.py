#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ITEM_DIR = Path('assets/items')
ITEMS = [
    'chest-frozen-island-normal.png',
    'chest-frozen-island-hard.png',
    'chest-frozen-island-hell.png',
    'key-normal.png',
    'key-hard.png',
    'key-hell.png',
    'mystery-chest.png',
    'epic-summon-ticket.png',
    'exp-tome.png',
    'ore-common.png',
    'ore-rare.png',
    'ore-unique.png',
    'ore-legendary.png',
    'ore-omni.png',
    'gift-box-pink.png',
    'gift-box-icy.png',
]

# The approved item masters were rendered against true black. We derive alpha from the
# black backing while protecting the solid item silhouette, dark linework and interior
# shading. This removes the backing itself rather than hiding it with CSS.
CORE_THRESHOLD = 38
ALPHA_LOW = 3
ALPHA_HIGH = 40
ALPHA_GAMMA = 0.78


def max_channel(rgb: Image.Image) -> Image.Image:
    r, g, b = rgb.split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b)


def fill_binary_holes(mask: Image.Image) -> Image.Image:
    inv = ImageOps.invert(mask)
    flooded = inv.copy()
    ImageDraw.floodfill(flooded, (0, 0), 128, thresh=0)
    holes = flooded.point(lambda p: 255 if p == 255 else 0, mode='L')
    return ImageChops.lighter(mask, holes)


def protected_core(vmax: Image.Image, is_key: bool) -> Image.Image:
    core = vmax.point([255 if i >= CORE_THRESHOLD else 0 for i in range(256)], mode='L')
    if is_key:
        # Preserve the metal/body and dark seams without filling the literal opening in
        # the key's ring.
        core = core.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
        return core.filter(ImageFilter.MaxFilter(3))

    # Close tiny dark seams, fill internal dark linework, and retain a one-pixel solid
    # boundary around the actual object. Negative space outside the item remains alpha.
    for _ in range(3):
        core = core.filter(ImageFilter.MaxFilter(3))
    for _ in range(3):
        core = core.filter(ImageFilter.MinFilter(3))
    core = fill_binary_holes(core)
    return core.filter(ImageFilter.MaxFilter(3))


def alpha_ramp(vmax: Image.Image) -> Image.Image:
    lut = []
    for value in range(256):
        t = max(0.0, min(1.0, (value - ALPHA_LOW) / (ALPHA_HIGH - ALPHA_LOW)))
        lut.append(round((t ** ALPHA_GAMMA) * 255))
    return vmax.point(lut, mode='L')


def make_transparent(path: Path) -> tuple[float, float, float]:
    rgb = Image.open(path).convert('RGB')
    vmax = max_channel(rgb)
    core = protected_core(vmax, path.name.startswith('key-'))
    alpha = ImageChops.lighter(alpha_ramp(vmax), core)

    # The canvas edge is always backing, never the item.
    px = alpha.load()
    width, height = alpha.size
    for x in range(width):
        px[x, 0] = 0
        px[x, height - 1] = 0
    for y in range(height):
        px[0, y] = 0
        px[width - 1, y] = 0

    histogram = alpha.histogram()
    total = width * height
    transparent = histogram[0] / total
    opaque = histogram[255] / total
    semi = 1.0 - transparent - opaque
    if transparent < 0.08:
        raise RuntimeError(f'{path}: background transparency is implausibly low ({transparent:.1%})')
    if opaque < 0.02:
        raise RuntimeError(f'{path}: foreground was over-removed ({opaque:.1%} opaque)')

    rgba = rgb.convert('RGBA')
    rgba.putalpha(alpha)
    rgba.save(path, format='PNG', optimize=True, compress_level=9)
    return transparent, semi, opaque


def main() -> None:
    missing = [name for name in ITEMS if not (ITEM_DIR / name).is_file()]
    if missing:
        raise SystemExit('Missing canonical item art: ' + ', '.join(missing))

    for name in ITEMS:
        path = ITEM_DIR / name
        transparent, semi, opaque = make_transparent(path)
        print(f'{path}: transparent={transparent:.1%}, soft-edge={semi:.1%}, opaque={opaque:.1%}')
    print(f'Transparent item-art v2 materialized for all {len(ITEMS)} canonical raster items.')


if __name__ == '__main__':
    main()
