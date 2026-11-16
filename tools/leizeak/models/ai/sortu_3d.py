#!/usr/bin/env python3
"""LEIZEEN DEIA: etsai nagusien eta pertsonaien 3D modeloak IA bidez (fal.ai).

  1. Kontzeptu-irudia: Flux (fal-ai/flux/dev), diseinu propioa, hondo zuria, gorputz osoa.
  2. Irudia → 3D: Tripo (tripo3d/tripo/v2.5/image-to-3d, fal.ai bidez), GLB testurarekin.
  3. Gero: garbitu.py (Blender, bpy) → public/assets/models/leizeak/<izena>.glb, eta meshopt.mjs.

Gakoa: FAL_KEY ingurune-aldagaia (Authorization: Key …), edo saioaren proxyak txertatzen duena.
Emaitzak: tools/leizeak/models/ai/<izena>/ (concept.jpg, tripo.glb, meta.json). Diseinu guztiak
originalak dira (euskal mitologia, gure eran); ez da beste jokoen pertsonaiarik erabiltzen.

  python3 tools/leizeak/models/ai/sortu_3d.py mikelats akerbeltz [--only-image] [--faces 9000]
"""
import argparse, json, os, pathlib, sys, time, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
STYLE = ('stylized low-poly 3D game character, clean hand-painted colors, chunky readable shapes, '
         'full body visible from head to feet, front three-quarter view, neutral A-pose, centered, '
         'plain pure white background, soft even studio lighting, no shadows on the background, '
         'no text, no logo, no frame, single character only')
ASSETS = {
    'mikelats': ('Mikelats, a tall stern storm lord from Basque mythology, young man with a pale blue-grey face '
                 'and glowing icy blue eyes, a crown of jagged white hail ice spikes, dark navy armor with thin '
                 'cyan lightning cracks, a long tattered black cloak made of living shadow that covers his feet, '
                 'arms slightly open, menacing but noble'),
    'akerbeltz': ('Akerbeltz, a black he-goat spirit from Basque folklore standing upright on two legs, big curled '
                  'ram horns, amber eyes with horizontal pupils, long goatee, wearing a long dark purple hooded robe '
                  'with a frayed hem, mystical and old, hands open'),
    'zezengorri': ('Zezengorri, a huge red fire bull from Basque folklore standing on four legs, long curved ivory '
                   'horns, a glowing orange ember set in its forehead, smoke and small flames at its nostrils, '
                   'muscular, side three-quarter view'),
    'eate': ('Eate, a storm and fire spirit from Basque folklore: a floating figure made of dark storm clouds '
             'with flaming orange hair, crackling lightning eyes, no legs, the lower body dissolving into cloud'),
}


def call(model, payload, wait=600):
    """fal.ai ilara: bidali, itxaron eta emaitza (JSON)."""
    hdr = {'Content-Type': 'application/json'}
    if os.environ.get('FAL_KEY'):
        hdr['Authorization'] = 'Key ' + os.environ['FAL_KEY']
    req = urllib.request.Request('https://queue.fal.run/' + model, data=json.dumps(payload).encode(), headers=hdr)
    sub = json.load(urllib.request.urlopen(req, timeout=60))
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
    urllib.request.urlretrieve(url, out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('names', nargs='+', choices=list(ASSETS))
    ap.add_argument('--only-image', action='store_true')
    ap.add_argument('--faces', type=int, default=9000)
    ap.add_argument('--seed', type=int, default=7)
    a = ap.parse_args()
    for name in a.names:
        d = HERE / name
        d.mkdir(exist_ok=True)
        meta_p = d / 'meta.json'
        meta = json.loads(meta_p.read_text()) if meta_p.exists() else {}
        if not (d / 'concept.jpg').exists():
            prompt = ASSETS[name] + '. ' + STYLE
            r = call('fal-ai/flux/dev', {'prompt': prompt, 'image_size': 'portrait_4_3', 'num_inference_steps': 32, 'guidance_scale': 3.5, 'seed': a.seed, 'num_images': 1, 'enable_safety_checker': True})
            meta['concept'] = {'model': 'fal-ai/flux/dev', 'prompt': prompt, 'seed': a.seed, 'url': r['images'][0]['url']}
            fetch(r['images'][0]['url'], d / 'concept.jpg')
            meta_p.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
            print(name, 'kontzeptua:', d / 'concept.jpg', flush=True)
        if a.only_image or (d / 'tripo.glb').exists():
            continue
        r = call('tripo3d/tripo/v2.5/image-to-3d', {'image_url': meta['concept']['url'], 'texture': 'standard', 'pbr': False, 'face_limit': a.faces, 'auto_size': True, 'orientation': 'default', 'seed': a.seed}, wait=900)
        mesh = r.get('model_mesh') or r.get('base_model') or {}
        meta['tripo'] = {'model': 'tripo3d/tripo/v2.5/image-to-3d', 'task_id': r.get('task_id'), 'faces': a.faces, 'url': mesh.get('url')}
        fetch(mesh['url'], d / 'tripo.glb')
        if r.get('rendered_image'):
            fetch(r['rendered_image']['url'], d / 'tripo_render.webp')
        meta_p.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
        print(name, '3D:', d / 'tripo.glb', (d / 'tripo.glb').stat().st_size // 1024, 'KB', flush=True)


if __name__ == '__main__':
    main()
