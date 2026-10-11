#!/usr/bin/env python3
"""EUSKARAZ GAMES · testura eta zeru CC0 sortzailea.

Poly Haven eta ambientCG-ko CC0 materialak eta HDRI zeruak deskargatzen ditu
eta mugikorrerako tamainan idazten ditu public/assets/ karpetan:

  public/assets/tex/<izena>_c.jpg   kolorea (albedo, sRGB)
  public/assets/tex/<izena>_n.jpg   normal mapa (OpenGL)
  public/assets/tex/<izena>_r.jpg   zimurtasuna (roughness, gris)
  public/assets/sky/<izena>.jpg     zerua (equirect, tonemapped)

Erabilera:  python3 tools/assets/build_assets.py [--only grass,concrete,...]
Behar dira: Python 3.10+, numpy, Pillow, curl.
"""
import argparse
import io
import json
import pathlib
import subprocess
import sys
import zipfile

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT_TEX = ROOT / 'public' / 'assets' / 'tex'
OUT_SKY = ROOT / 'public' / 'assets' / 'sky'

# izena: (iturria, id, tamaina, modua)
#   modua 'color'  → argazkiaren kolorea bere horretan
#   modua 'detail' → kolore neutroa (grisa): jokoak bere kolorea biderkatzen dio
TEXTURES = {
    'grass':    ('acg', 'Grass001', 512, 'color'),
    'forest':   ('ph', 'brown_mud_leaves_01', 512, 'color'),
    'dirt':     ('ph', 'brown_mud_dry', 512, 'color'),
    'concrete': ('ph', 'concrete_floor_worn_001', 512, 'detail'),
    'wall':     ('ph', 'grey_plaster', 512, 'detail'),
    'plaster':  ('ph', 'plastered_wall', 512, 'color'),
    'wood':     ('ph', 'wood_planks', 512, 'color'),
    'planks':   ('ph', 'weathered_brown_planks', 512, 'color'),
    'stone':    ('ph', 'stone_wall', 512, 'color'),
    'rock':     ('ph', 'aerial_rocks_02', 512, 'color'),
    'roof':     ('ph', 'clay_roof_tiles_02', 512, 'color'),
    'metal':    ('ph', 'metal_plate', 512, 'detail'),
    'rust':     ('ph', 'rusty_metal_02', 512, 'color'),
    'corrugated': ('ph', 'corrugated_iron', 512, 'detail'),
    'granite':  ('ph', 'granite_tile_04', 512, 'detail'),
    'cliff':    ('ph', 'cliff_side', 512, 'detail'),
    'bark':     ('ph', 'bark_brown_02', 512, 'color'),
    'snow':     ('ph', 'snow_02', 512, 'color'),
    'sand':     ('ph', 'coast_sand_01', 512, 'color'),
}

# izena: (Poly Haven HDRI id, esposizioa, zabalera)
SKIES = {
    'day':      ('kloofendal_48d_partly_cloudy_puresky', 1.0, 2048),
    'dusk':     ('belfast_sunset_puresky', 0.55, 2048),
    'overcast': ('kloppenheim_07_puresky', 1.1, 2048),
}
# Gaueko zerua prozedurala da (HDRI argazkiak luzeegi esposatuta daude gauerako).

CREDITS = {
    'ph': ('Poly Haven', 'https://polyhaven.com/a/{id}'),
    'acg': ('ambientCG', 'https://ambientcg.com/view?id={id}'),
}


def fetch(url: str) -> bytes:
    res = subprocess.run(['curl', '-sSfL', '--retry', '3', '--max-time', '300', url],
                         check=True, capture_output=True)
    return res.stdout


def polyhaven_maps(asset_id: str) -> dict:
    files = json.loads(fetch(f'https://api.polyhaven.com/files/{asset_id}'))
    pick = {'c': 'Diffuse', 'n': 'nor_gl', 'r': 'Rough'}
    out = {}
    for key, name in pick.items():
        out[key] = Image.open(io.BytesIO(fetch(files[name]['1k']['jpg']['url'])))
    return out


def ambientcg_maps(asset_id: str) -> dict:
    data = fetch(f'https://ambientcg.com/get?file={asset_id}_1K-JPG.zip')
    zf = zipfile.ZipFile(io.BytesIO(data))
    names = zf.namelist()

    def grab(suffix):
        name = next(n for n in names if n.endswith(suffix))
        return Image.open(io.BytesIO(zf.read(name)))
    return {'c': grab('_Color.jpg'), 'n': grab('_NormalGL.jpg'), 'r': grab('_Roughness.jpg')}


def to_detail(img: Image.Image) -> Image.Image:
    """Kolorea kendu eta argitasuna 0.86 ingurura ekarri, jokoak tindatu dezan."""
    a = np.asarray(img.convert('RGB'), dtype=np.float32) / 255.0
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    lum = lum / max(float(lum.mean()), 1e-3) * 0.86
    lum = 0.86 + (lum - 0.86) * 0.75  # kontrastea apur bat leundu
    lum = np.clip(lum, 0.0, 1.0)
    return Image.fromarray((np.stack([lum] * 3, -1) * 255 + 0.5).astype(np.uint8))


def build_texture(name: str, spec: tuple) -> dict:
    src, asset_id, size, mode = spec
    maps = polyhaven_maps(asset_id) if src == 'ph' else ambientcg_maps(asset_id)
    color = maps['c'].convert('RGB')
    if mode == 'detail':
        color = to_detail(color)
    out = {}
    for key, img, quality in (('c', color, 82), ('n', maps['n'].convert('RGB'), 88),
                              ('r', maps['r'].convert('L'), 80)):
        img = img.resize((size, size), Image.LANCZOS)
        path = OUT_TEX / f'{name}_{key}.jpg'
        img.save(path, 'JPEG', quality=quality, optimize=True, progressive=True)
        out[key] = path.stat().st_size
    return out


def read_hdr(data: bytes) -> np.ndarray:
    """Radiance .hdr (RGBE, RLE) irakurlea → float32 HxWx3."""
    buf = memoryview(data)
    pos = 0
    width = height = None
    while True:
        end = data.index(b'\n', pos)
        line = data[pos:end].decode('ascii', 'replace').strip()
        pos = end + 1
        if line.startswith('-Y') or line.startswith('+Y'):
            parts = line.split()
            height, width = int(parts[1]), int(parts[3])
            break
    img = np.zeros((height, width, 4), dtype=np.uint8)
    for y in range(height):
        if buf[pos] == 2 and buf[pos + 1] == 2 and (buf[pos + 2] << 8 | buf[pos + 3]) == width:
            pos += 4
            for ch in range(4):
                x = 0
                while x < width:
                    count = buf[pos]
                    pos += 1
                    if count > 128:
                        count -= 128
                        img[y, x:x + count, ch] = buf[pos]
                        pos += 1
                    else:
                        img[y, x:x + count, ch] = np.frombuffer(buf[pos:pos + count], dtype=np.uint8)
                        pos += count
                    x += count
        else:
            row = np.frombuffer(buf[pos:pos + width * 4], dtype=np.uint8).reshape(width, 4)
            img[y] = row
            pos += width * 4
    e = img[..., 3].astype(np.int32)
    scale = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0).astype(np.float32)
    return img[..., :3].astype(np.float32) * scale[..., None]


def aces(x: np.ndarray) -> np.ndarray:
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0)


def ground_below_horizon(lin: np.ndarray) -> np.ndarray:
    """'puresky' HDRIek ispilu-itsaso bat dute horizontearen azpian: lur ilun leun batekin ordezkatu.
    Horrela ingurune-argiak ez du behetik zerua islatzen eta kupulak ez du ura dirudi."""
    h = lin.shape[0]
    mid = h // 2
    band = lin[mid - max(2, h // 64):mid].mean(axis=(0, 1))
    ground = band * np.array([0.42, 0.40, 0.36]) / max(band.mean(), 1e-4) * band.mean() * 0.55
    rows = np.arange(h - mid, dtype=np.float32) / max(h - mid - 1, 1)
    t = np.clip(rows / 0.06, 0, 1)[:, None, None]   # 0 → horizontea, 1 → lurra
    lower = band[None, None, :] * (1 - t) + ground[None, None, :] * t
    out = lin.copy()
    out[mid:] = lower
    return out


def build_sky(name: str, spec: tuple) -> int:
    asset_id, exposure, width = spec
    files = json.loads(fetch(f'https://api.polyhaven.com/files/{asset_id}'))
    res = '2k' if width >= 2048 else '1k'
    hdr = read_hdr(fetch(files['hdri'][res]['hdr']['url']))
    ldr = aces(hdr * exposure * 0.6)
    ldr = ground_below_horizon(ldr)
    srgb = np.where(ldr <= 0.0031308, ldr * 12.92, 1.055 * np.power(ldr, 1 / 2.4) - 0.055)
    img = Image.fromarray((np.clip(srgb, 0, 1) * 255 + 0.5).astype(np.uint8))
    img = img.resize((width, width // 2), Image.LANCZOS)
    path = OUT_SKY / f'{name}.jpg'
    img.save(path, 'JPEG', quality=80, optimize=True, progressive=True)
    return path.stat().st_size


def build_night_sky(width: int = 2048) -> int:
    """Gaueko zerua: gradientea, ilargia eta izarrak (prozedurala, equirect)."""
    h = width // 2
    rng = np.random.default_rng(1802)
    v = (np.arange(h, dtype=np.float32) + 0.5) / h
    u = (np.arange(width, dtype=np.float32) + 0.5) / width
    theta = v[:, None] * np.pi                     # 0 = goian
    phi = u[None, :] * 2 * np.pi
    dx, dy, dz = np.sin(theta) * np.cos(phi), np.cos(theta) * np.ones_like(phi), np.sin(theta) * np.sin(phi)
    el = dy                                        # sin(elebazioa)
    zen, hor, low = np.array([3, 7, 20]), np.array([24, 40, 66]), np.array([8, 12, 20])
    t = np.clip(el, 0, 1) ** 0.45
    sky = hor[None, None] * (1 - t[..., None]) + zen[None, None] * t[..., None]
    sky = np.where(el[..., None] < 0, low[None, None] + (hor - low)[None, None] * np.exp(el[..., None] * 9), sky)
    sky = sky.astype(np.float32) / 255.0
    # ilargia
    m_el, m_az = np.radians(26), 0.62 * np.pi
    m = np.array([np.cos(m_el) * np.cos(m_az), np.sin(m_el), np.cos(m_el) * np.sin(m_az)])
    cosang = dx * m[0] + dy * m[1] + dz * m[2]
    ang = np.degrees(np.arccos(np.clip(cosang, -1, 1)))
    glow = 0.32 * np.exp(-ang / 9.0) + 0.10 * np.exp(-ang / 30.0)
    sky += glow[..., None] * np.array([0.55, 0.68, 0.9])[None, None]
    disc = np.clip((1.15 - ang) / 0.12, 0, 1)
    sky = sky * (1 - disc[..., None]) + disc[..., None] * np.array([0.93, 0.94, 0.88])[None, None]
    # esne bidea (zarata leun bat zirkulu handi baten inguruan)
    band = np.exp(-((dx * 0.42 + dy * 0.62 - dz * 0.66) ** 2) / 0.018)
    noise = rng.normal(size=(h // 16, width // 16)).astype(np.float32)
    noise = np.asarray(Image.fromarray(((noise - noise.min()) / np.ptp(noise) * 255).astype(np.uint8))
                       .resize((width, h), Image.BICUBIC), dtype=np.float32) / 255.0
    sky += (band * (0.25 + 0.75 * noise) * 0.10 * np.clip(el * 4, 0, 1))[..., None] * np.array([0.7, 0.75, 0.95])
    # izarrak
    n = 9000
    zs = rng.uniform(-0.15, 1.0, n)
    ps = rng.uniform(0, 2 * np.pi, n)
    th = np.arccos(zs)
    px = (ps / (2 * np.pi) * width).astype(int) % width
    py = np.clip((th / np.pi * h).astype(int), 0, h - 1)
    mag = rng.pareto(2.2, n) * 0.18 + 0.05
    fade = np.clip(zs * 5, 0, 1) * (1 - np.clip((1.6 - ang[py, px]) / 6, 0, 1))
    tint = np.stack([0.85 + 0.15 * rng.random(n), 0.88 + 0.1 * rng.random(n), np.ones(n)], -1)
    for oy, ox, w in ((0, 0, 1.0), (0, 1, 0.35), (1, 0, 0.35), (0, -1, 0.35), (-1, 0, 0.35)):
        yy = np.clip(py + oy, 0, h - 1)
        xx = (px + ox) % width
        np.add.at(sky, (yy, xx), (np.minimum(mag, 1.4) * fade * w)[:, None] * tint)
    srgb = np.clip(sky, 0, 1)
    img = Image.fromarray((srgb * 255 + 0.5).astype(np.uint8))
    path = OUT_SKY / 'night.jpg'
    img.save(path, 'JPEG', quality=86, optimize=True, progressive=True)
    return path.stat().st_size


def build_water_normal(size: int = 512) -> int:
    """Itsasoaren normal mapa, prozedurala eta errepikagarria (FFT zarata)."""
    rng = np.random.default_rng(20261011)
    fx = np.fft.fftfreq(size)[None, :]
    fy = np.fft.fftfreq(size)[:, None]
    k = np.sqrt(fx * fx + fy * fy)
    k[0, 0] = 1.0
    spectrum = (rng.normal(size=(size, size)) + 1j * rng.normal(size=(size, size)))
    spectrum *= np.exp(-((k - 0.012) ** 2) / 0.0009) + 0.35 * np.exp(-((k - 0.05) ** 2) / 0.002)
    spectrum *= 1.0 + 0.6 * (np.abs(fx) > np.abs(fy))  # haizearen norabidea
    spectrum[0, 0] = 0
    h = np.real(np.fft.ifft2(spectrum))
    h = (h - h.mean()) / (h.std() + 1e-6)
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    strength = 2.2
    n = np.stack([-dx * strength, dy * strength, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    img = Image.fromarray(((n * 0.5 + 0.5) * 255 + 0.5).astype(np.uint8))
    path = OUT_TEX / 'water_n.jpg'
    img.save(path, 'JPEG', quality=90, optimize=True)
    return path.stat().st_size


def write_credits() -> None:
    lines = ['# Testurak eta zeruak · CC0', '',
             'Fitxategi hauek `tools/assets/build_assets.py` scriptarekin sortu dira.',
             'Jatorrizko material guztiak **CC0** (domeinu publikoa) lizentziakoak dira.', '',
             '| Fitxategia | Iturria | Jatorrizko materiala |', '|---|---|---|']
    for name, (src, asset_id, _size, _mode) in TEXTURES.items():
        site, url = CREDITS[src]
        lines.append(f'| `tex/{name}_*.jpg` | {site} | [{asset_id}]({url.format(id=asset_id)}) |')
    for name, (asset_id, _exp, _w) in SKIES.items():
        lines.append(f'| `sky/{name}.jpg` | Poly Haven | [{asset_id}](https://polyhaven.com/a/{asset_id}) |')
    lines.append('| `sky/night.jpg` | EUSKARAZ GAMES | prozedurala (izarrak eta ilargia) |')
    lines.append('| `tex/water_n.jpg` | EUSKARAZ GAMES | prozedurala (FFT zarata) |')
    lines += ['', 'Poly Haven: https://polyhaven.com/license · ambientCG: https://ambientcg.com/license', '']
    (ROOT / 'public' / 'assets' / 'CREDITS.md').write_text('\n'.join(lines), encoding='utf-8')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    only = {s for s in args.only.split(',') if s}
    OUT_TEX.mkdir(parents=True, exist_ok=True)
    OUT_SKY.mkdir(parents=True, exist_ok=True)
    total = 0
    for name, spec in TEXTURES.items():
        if only and name not in only:
            continue
        sizes = build_texture(name, spec)
        total += sum(sizes.values())
        print(f'tex  {name:9s} {sizes}')
    for name, spec in SKIES.items():
        if only and name not in only:
            continue
        size = build_sky(name, spec)
        total += size
        print(f'sky  {name:9s} {size}')
    if not only or 'night' in only:
        size = build_night_sky()
        total += size
        print(f'sky  night     {size}')
    if not only or 'water' in only:
        size = build_water_normal()
        total += size
        print(f'tex  water_n   {size}')
    write_credits()
    print(f'guztira {total / 1e6:.2f} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
