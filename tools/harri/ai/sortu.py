#!/usr/bin/env python3
"""HARRI · fal.ai arte-pipeline-a (Python stdlib + Pillow).

  python3 tools/harri/ai/sortu.py tex [rock moss ...]   # testura jarraituak → public/harri/assets/tex/*.jpg
  python3 tools/harri/ai/sortu.py harri                 # 02 lamina → kontext (A-pose) → Tripo GLB
  python3 tools/harri/ai/sortu.py azala                 # atariko azala → public/harri/assets/azala.jpg
  python3 tools/harri/ai/sortu.py seamless              # testurak berriz jarraitu (fal deirik gabe)

Gakoa: saioaren proxyak txertatzen du (queue.fal.run), edo FAL_KEY ingurune-aldagaia. Ez idatzi gakorik hemen.
Emaitza bakoitzak `tools/harri/ai/<izena>/meta.json` du (modeloa, prompt-a, seed-a eta URL-a).
Dagoeneko sortutako fitxategiak ez dira berriz eskatzen (ezabatu raw/concept fitxategia berriz sortzeko).
Arau finkoa: Harriren bularra harri leuna, ikurrik/letrarik gabe; irudietan testurik ez.
"""
import base64, io, json, os, pathlib, sys, time, urllib.request
from PIL import Image, ImageChops, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
TEX_OUT = ROOT / 'public/harri/assets/tex'
PLATE = ROOT / 'tools/harri/biblia/02_eredu_nagusia_harri_ikurrik_gabe.jpg'
CROP = (598, 18, 790, 226)  # 02 laminako aurreko ikuspegia (txandakatzearen ezkerreko irudia)

TEX_STYLE = ('uniform close-up material surface texture, the entire image is evenly covered with the same material, '
             'repeating pattern with no focal point and no empty area, orthographic view straight down, '
             'stylized hand-painted game texture, flat even diffuse lighting, no cast shadows, no vignette, '
             'warm natural colors, no text, no letters, no symbols')
TEXTURES = {
    'rock': 'solid warm tan-grey granite stone surface, fine grey and beige mineral speckles, subtle cracks, a few small pale green and ochre lichen spots',
    'moss': 'thick soft green moss carpet with small variations of yellow-green and dark green tufts',
    'grass': 'stylized lush green meadow grass seen from above, short grass blades, a few tiny scattered white daisies',
    'dirt': 'packed brown earth footpath with tiny pebbles and fine soil texture',
    'block': 'roughly dressed warm grey granite stone face, coarse granular grain, fine diagonal chisel tool marks, small chips and a few faint ochre stains',
    'thatch': 'golden straw thatch roof, long parallel bundles of dry straw running vertically',
    'wood': 'weathered grey-brown oak wooden planks running horizontally, visible grain and a few knots',
}
SEEDS = {'rock': 11, 'moss': 12, 'grass': 13, 'dirt': 14, 'block': 25, 'thatch': 16, 'wood': 17}

HARRI_PROMPT = ('Show the exact same small stone golem character from the left figure (front view), alone, full body from '
                'head to feet, standing in a relaxed A-pose with both arms held slightly away from the body so there is clear '
                'space between arms and torso, legs slightly apart, facing the camera straight on, symmetrical. Keep the '
                'same warm tan-grey rounded stones, green moss and small white daisies on the head and shoulders, the same '
                'big amber eyes and friendly face. The chest is smooth natural stone with no symbols, no marks, no carvings. '
                'Plain pure white background, soft even studio lighting, no shadow, no text, single character only, '
                'remove the second figure.')
AZALA_PROMPT = ('Painterly game key art illustration, wide 16:9 landscape. The same small friendly mossy stone golem '
                'character from the reference (rounded warm grey stones, green moss with tiny white daisies on its head, big '
                'amber eyes, smooth unmarked stone chest) stands on a grassy dirt path in the foreground, smiling. Behind him '
                'on a green hill, an Iron Age Basque hillfort: round dry-stone huts with conical straw thatch roofs and a '
                'wooden palisade. Golden early morning light, soft mist, rolling green Basque mountains in the distance, '
                'wildflowers. Rich hand-painted colors, cinematic depth. No text, no letters, no logo, no symbols, no emblems.')


def call(model, payload, wait=900):
    """fal.ai ilara: bidali → status_url itxaron → response_url."""
    hdr = {'Content-Type': 'application/json'}
    if os.environ.get('FAL_KEY'):
        hdr['Authorization'] = 'Key ' + os.environ['FAL_KEY']
    req = urllib.request.Request('https://queue.fal.run/' + model, data=json.dumps(payload).encode(), headers=hdr)
    sub = json.load(urllib.request.urlopen(req, timeout=120))
    t0 = time.time()
    while time.time() - t0 < wait:
        st = json.load(urllib.request.urlopen(urllib.request.Request(sub['status_url'], headers=hdr), timeout=60))
        if st.get('status') == 'COMPLETED':
            return json.load(urllib.request.urlopen(urllib.request.Request(sub['response_url'], headers=hdr), timeout=120))
        if st.get('status') not in ('IN_QUEUE', 'IN_PROGRESS'):
            sys.exit(f'{model}: {st}')
        time.sleep(4)
    sys.exit(f'{model}: denbora agortuta')


def fetch(url, out):
    with urllib.request.urlopen(url, timeout=300) as r:
        pathlib.Path(out).write_bytes(r.read())
    return out


def save_meta(name, key, data):
    d = HERE / name
    d.mkdir(parents=True, exist_ok=True)
    p = d / 'meta.json'
    meta = json.loads(p.read_text()) if p.exists() else {}
    meta[key] = data
    p.write_text(json.dumps(meta, ensure_ascii=False, indent=1))


def data_uri(img, fmt='PNG'):
    b = io.BytesIO()
    img.save(b, fmt)
    return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()


# ---------------------------------------------------------------- testurak
def flatten(img, strength=0.75):
    """Eskala handiko argi-aldaketak kendu (high-pass leuna): mosaikoan banda/orban errepikatuak saihesteko."""
    from PIL import ImageStat
    blur = img.filter(ImageFilter.GaussianBlur(img.width / 6))
    mean = ImageStat.Stat(img).mean
    flat = Image.new('RGB', (1, 1), tuple(int(c) for c in mean)).resize(img.size)
    diff = ImageChops.subtract(flat, blur, 1, 128)  # (mean - blur) + 128
    corr = ImageChops.add(img, diff, 1, -128)       # img + mean - blur
    return Image.blend(img, corr, strength)


TWEAK = {'rock': 0.6}  # saturazioa (rock: gris epelagoa, ez laranja)


def make_seamless(img, size=512, margin=0.06, blend=0.18):
    """Ertz-nahasketa: ertz-marjina moztu, gero eskuineko/beheko zerrenda ezkerreko/goiko ertzaren gainean
    gurutzatu (smoothstep). Emaitzaren ertz kontrakoak jatorrian aldameneko pixelak dira → jostura gabe."""
    img = img.convert('RGB')
    w, h = img.size
    m = int(w * margin)
    img = img.crop((m, m, w - m, h - m))
    img = flatten(img)
    def axis(im, horiz):
        n = im.width if horiz else im.height
        b = int(n * blend)
        out_n = n - b
        body = im.crop((0, 0, out_n, im.height)) if horiz else im.crop((0, 0, im.width, out_n))
        tail = im.crop((out_n, 0, n, im.height)) if horiz else im.crop((0, out_n, im.width, n))
        head = body.crop((0, 0, b, im.height)) if horiz else body.crop((0, 0, im.width, b))
        mask = Image.new('L', head.size)
        mp = mask.load()
        for i in range(b):
            t = i / (b - 1)
            v = int(255 * t * t * (3 - 2 * t))  # 0 → isatsa (tail), 1 → burua (head)
            for j in range(head.height if horiz else head.width):
                if horiz:
                    mp[i, j] = v
                else:
                    mp[j, i] = v
        body.paste(Image.composite(head, tail, mask), (0, 0))
        return body
    img = axis(axis(img, True), False)
    return img.resize((size, size), Image.LANCZOS)


def save_jpeg(img, path, max_kb):
    for q in (82, 78, 74, 70, 65, 60):
        b = io.BytesIO()
        img.save(b, 'JPEG', quality=q, optimize=True, progressive=True)
        if b.tell() <= max_kb * 1024:
            break
    pathlib.Path(path).write_bytes(b.getvalue())
    return q, b.tell() // 1024


def tile_check(name, img):
    t = Image.new('RGB', (img.width * 2, img.height * 2))
    for i in range(2):
        for j in range(2):
            t.paste(img, (i * img.width, j * img.height))
    t.save(HERE / 'tex' / f'{name}_2x2.jpg', quality=80)


def tex(names):
    (HERE / 'tex').mkdir(exist_ok=True)
    TEX_OUT.mkdir(parents=True, exist_ok=True)
    for name in names or list(TEXTURES):
        raw = HERE / 'tex' / f'{name}_raw.jpg'
        if not raw.exists():
            prompt = TEXTURES[name] + '. ' + TEX_STYLE
            r = call('fal-ai/flux/dev', {'prompt': prompt, 'image_size': 'square_hd', 'num_inference_steps': 30,
                                         'guidance_scale': 3.5, 'seed': SEEDS[name], 'num_images': 1,
                                         'enable_safety_checker': True})
            fetch(r['images'][0]['url'], raw)
            save_meta('tex', name, {'model': 'fal-ai/flux/dev', 'prompt': prompt, 'seed': SEEDS[name],
                                    'url': r['images'][0]['url']})
        seamless_one(name)


def seamless_one(name):
    raw = HERE / 'tex' / f'{name}_raw.jpg'
    img = make_seamless(Image.open(raw))
    if name in TWEAK:
        from PIL import ImageEnhance
        img = ImageEnhance.Color(img).enhance(TWEAK[name])
    q, kb = save_jpeg(img, TEX_OUT / f'{name}.jpg', 120)
    tile_check(name, img)
    print(f'{name}.jpg  q={q}  {kb} KB', flush=True)


# ---------------------------------------------------------------- Harri
def harri():
    d = HERE / 'harri'
    d.mkdir(exist_ok=True)
    crop_p = d / 'plate02_crop.png'
    if not crop_p.exists():
        c = Image.open(PLATE).convert('RGB').crop(CROP)
        c.resize((c.width * 4, c.height * 4), Image.LANCZOS).save(crop_p)
    meta_p = d / 'meta.json'
    meta = json.loads(meta_p.read_text()) if meta_p.exists() else {}
    if not (d / 'concept.png').exists():
        model = 'fal-ai/flux-pro/kontext'
        r = call(model, {'prompt': HARRI_PROMPT, 'image_url': data_uri(Image.open(crop_p)), 'seed': 21,
                         'guidance_scale': 3.5, 'aspect_ratio': '3:4', 'output_format': 'png',
                         'num_images': 1, 'safety_tolerance': '2'})
        url = r['images'][0]['url']
        fetch(url, d / 'concept.png')
        save_meta('harri', 'concept', {'model': model, 'prompt': HARRI_PROMPT, 'seed': 21, 'url': url,
                                       'input': 'plate02_crop.png (02 lamina, ' + str(CROP) + ')'})
        meta = json.loads(meta_p.read_text())
        print('kontzeptua:', d / 'concept.png', flush=True)
    if not (d / 'tripo.glb').exists():
        model = 'tripo3d/tripo/v2.5/image-to-3d'
        r = call(model, {'image_url': meta['concept']['url'], 'texture': 'standard', 'pbr': False,
                         'face_limit': 12000, 'auto_size': True, 'orientation': 'default', 'seed': 21}, wait=1200)
        mesh = r.get('model_mesh') or r.get('base_model') or {}
        fetch(mesh['url'], d / 'tripo.glb')
        if r.get('rendered_image'):
            fetch(r['rendered_image']['url'], d / 'tripo_render.webp')
        save_meta('harri', 'tripo', {'model': model, 'seed': 21, 'face_limit': 12000, 'texture': 'standard',
                                     'task_id': r.get('task_id'), 'url': mesh.get('url')})
        print('3D:', d / 'tripo.glb', (d / 'tripo.glb').stat().st_size // 1024, 'KB', flush=True)


# ---------------------------------------------------------------- azala
def azala():
    d = HERE / 'azala'
    d.mkdir(exist_ok=True)
    raw = d / 'azala_raw.png'
    if not raw.exists():
        ref = HERE / 'harri' / 'concept.png'
        ref = ref if ref.exists() else HERE / 'harri' / 'plate02_crop.png'
        model = 'fal-ai/flux-pro/kontext'
        r = call(model, {'prompt': AZALA_PROMPT, 'image_url': data_uri(Image.open(ref).convert('RGB'), 'JPEG'),
                         'seed': 31, 'guidance_scale': 3.5, 'aspect_ratio': '16:9', 'output_format': 'png',
                         'num_images': 1, 'safety_tolerance': '2'})
        url = r['images'][0]['url']
        fetch(url, raw)
        save_meta('azala', 'azala', {'model': model, 'prompt': AZALA_PROMPT, 'seed': 31, 'url': url,
                                     'input': ref.name})
    img = Image.open(raw).convert('RGB')
    w, h = img.size  # 16:9 moztu eta 960x540
    th = int(w * 9 / 16)
    if th <= h:
        img = img.crop((0, (h - th) // 2, w, (h - th) // 2 + th))
    else:
        tw = int(h * 16 / 9)
        img = img.crop(((w - tw) // 2, 0, (w - tw) // 2 + tw, h))
    img = img.resize((960, 540), Image.LANCZOS)
    out = ROOT / 'public/harri/assets/azala.jpg'
    out.parent.mkdir(parents=True, exist_ok=True)
    q, kb = save_jpeg(img, out, 150)
    print(f'azala.jpg q={q} {kb} KB', flush=True)


if __name__ == '__main__':
    cmd, rest = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ('', [])
    if cmd == 'tex':
        tex(rest)
    elif cmd == 'seamless':
        for n in rest or TEXTURES:
            seamless_one(n)
    elif cmd == 'harri':
        harri()
    elif cmd == 'azala':
        azala()
    else:
        sys.exit(__doc__)
