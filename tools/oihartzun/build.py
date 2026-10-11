#!/usr/bin/env python3
"""OIHARTZUN muntatu: tools/oihartzun/src/* → public/games/oihartzun.html

Iturburu irakurgarria src/ karpetan dago (game.js, head.html, extra.css...).
three.js r128 + GLTFLoader eta GLTF modeloak (KayKit, CC0) ez daude errepikatuta:
lehendik muntatutako fitxategitik ateratzen dira ("vendor" blokea).

  python3 tools/oihartzun/build.py            # muntatu
  python3 tools/oihartzun/build.py --check    # muntatu gabe, sintaxia egiaztatu
"""
import base64, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = pathlib.Path(__file__).resolve().parent / 'src'
OUT = ROOT / 'public/games/oihartzun.html'
VENDOR_START = '<script>/**\n * @license\n * Copyright 2010-2021 Three.js Authors'
GAME_START = "\n</script><script>(()=>{'use strict';\n"


MODELS = pathlib.Path(__file__).resolve().parent / 'models'


def vendor_block():
    html = OUT.read_text(encoding='utf-8')
    a = html.index(VENDOR_START)
    b = html.index(GAME_START, a)
    v = html[a:b]
    # KayKit modeloak (models/*.glb, build_models.mjs-ek sortuak): sorgina eta hezurdurak
    v = re.sub(r'/\*SKEL\*/.*?/\*SKEL-END\*/', '', v, flags=re.S)
    b64 = lambda f: base64.b64encode((MODELS / f).read_bytes()).decode()
    if (MODELS / 'mage.glb').exists():
        v = re.sub(r'const MAGE="[^"]*"', lambda m: 'const MAGE="' + b64('mage.glb') + '"', v, count=1)
    skel = {k: b64('skel_%s.glb' % k) for k in ('minion', 'mage', 'warrior') if (MODELS / ('skel_%s.glb' % k)).exists()}
    v += '/*SKEL*/;const SKEL_GLB=' + repr(skel).replace("'", '"') + ';/*SKEL-END*/'
    return v


def include(text):
    """/* @include fitxategia.js */ lerroak src/ karpetako fitxategiarekin ordezkatu."""
    def sub(m):
        return include((SRC / m.group(1)).read_text(encoding='utf-8').rstrip('\n'))
    return re.sub(r'^[ \t]*/\* @include ([\w.-]+) \*/[ \t]*$', sub, text, flags=re.M)


def assemble():
    head = (SRC / 'head.html').read_text(encoding='utf-8')
    css = (SRC / 'extra.css').read_text(encoding='utf-8')
    head = head.replace('</style></head>', '</style><style id="oih2">\n' + css + '\n</style></head>', 1)
    body = (SRC / 'extra_body.html').read_text(encoding='utf-8')
    head = head.replace('<div id="fatal" hidden></div>', body + '<div id="fatal" hidden></div>', 1)
    game = include((SRC / 'game.js').read_text(encoding='utf-8'))
    tail = (SRC / 'tail.html').read_text(encoding='utf-8')
    return head + '\n' + vendor_block() + GAME_START + game + '\n' + tail, game


def main():
    html, game = assemble()
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write("(()=>{'use strict';\n" + game)  # game.js IIFE-a bera ixten du
    r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True)
    pathlib.Path(f.name).unlink()
    if r.returncode:
        sys.exit('SINTAXI-ERROREA game.js:\n' + r.stderr[-2000:])
    if '--check' in sys.argv:
        print('sintaxia ondo')
        return
    OUT.write_text(html, encoding='utf-8')
    print(OUT.relative_to(ROOT), len(html))


if __name__ == '__main__':
    main()
