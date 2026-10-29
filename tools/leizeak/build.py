#!/usr/bin/env python3
"""LEIZEEN DEIA muntatu: tools/leizeak/src/* → public/games/leizeak.html

Iturburu irakurgarria src/ karpetan dago (game.js, head.html, extra.css...).
three.js r128 + GLTFLoader OIHARTZUN-en fitxategitik ateratzen dira ("vendor" blokea); modeloak
(KayKit, CC0) tools/leizeak/models/*.glb fitxategietatik (build_models.mjs-ek sortuak).

  python3 tools/leizeak/build.py            # muntatu
  python3 tools/leizeak/build.py --check    # muntatu gabe, sintaxia egiaztatu
"""
import base64, json, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / 'src'
MODELS = HERE / 'models'
FONTS = HERE / 'fonts'
OUT = ROOT / 'public/games/leizeak.html'
VENDOR_SRC = ROOT / 'public/games/oihartzun.html'
VENDOR_START = '<script>/**\n * @license\n * Copyright 2010-2021 Three.js Authors'
GAME_START = "\n</script><script>(()=>{'use strict';\n"


def js_object_end(text, start):
    """`{`-tik bere `}` parekoraino (kateak kontuan hartuta)."""
    depth, i = 0, start
    while True:
        c = text[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i + 1
        elif c == '"':
            i += 1
            while text[i] != '"':
                if text[i] == '\\':
                    i += 1
                i += 1
        i += 1


def vendor_block():
    html = VENDOR_SRC.read_text(encoding='utf-8')
    a = html.index(VENDOR_START)
    b = html.index(GAME_START, a)
    v = html[a:b]
    # OIHARTZUN-en glTF zaharrak (ASSETS) ez dira behar: props.glb-k ordezkatzen ditu
    i = v.index('const ASSETS=') + len('const ASSETS=')
    v = v[:i] + '{}' + v[js_object_end(v, i):]
    v = re.sub(r'/\*SKEL\*/.*?/\*SKEL-END\*/', '', v, flags=re.S)
    b64 = lambda f: base64.b64encode((MODELS / f).read_bytes()).decode()
    v = re.sub(r'const MAGE="[^"]*"', lambda m: 'const MAGE="' + b64('mage.glb') + '"', v, count=1)
    skel = {k: b64('skel_%s.glb' % k) for k in ('minion', 'mage', 'warrior')}
    npc = {k: b64('npc_%s.glb' % k) for k in ('barbarian', 'knight', 'rogue', 'hooded')}
    v += '/*SKEL*/;const SKEL_GLB=' + repr(skel).replace("'", '"') + ';/*SKEL-END*/'
    v += '/*NPC*/;const NPC_GLB=' + repr(npc).replace("'", '"') + ';/*NPC-END*/'
    v += '/*PROPS*/;const PROPS_GLB="' + b64('props.glb') + '";/*PROPS-END*/'
    # modeloak meshoptimizer-ekin trinkotuta daude (models/meshopt.mjs): deskodetzailea (MIT), WASM barruan
    v += ';\n' + (HERE / 'vendor/meshopt_decoder.js').read_text(encoding='utf-8')
    return v


def include(text):
    """/* @include fitxategia.js */ lerroak src/ karpetako fitxategiarekin ordezkatu;
    /* @json bidea.json */ (src/-rekiko) JSON trinkoarekin (adib. ahotsen lerroak)."""
    def sub(m):
        return include((SRC / m.group(1)).read_text(encoding='utf-8').rstrip('\n'))
    text = re.sub(r'^[ \t]*/\* @include ([\w.-]+) \*/[ \t]*$', sub, text, flags=re.M)
    return re.sub(r'/\* @json ([\w./-]+) \*/', lambda m: json.dumps(json.loads((SRC / m.group(1)).read_text(encoding='utf-8')), ensure_ascii=False, separators=(',', ':')), text)


def font_faces():
    """Izenburuko letra-tipoa (Cinzel, SIL OFL 1.1: fonts/OFL-Cinzel.txt) base64-z txertatuta:
    fitxategi bakarra, sarerik gabe ere bai. Ez badago, Georgia (CSS-ko ordezkoa)."""
    f = FONTS / 'cinzel.woff2'
    if not f.exists():
        return ''
    return ('@font-face{font-family:"Cinzel";src:url(data:font/woff2;base64,%s) format("woff2");'
            'font-weight:400 900;font-display:swap}\n' % base64.b64encode(f.read_bytes()).decode())


def assemble():
    head = (SRC / 'head.html').read_text(encoding='utf-8')
    css = font_faces() + (SRC / 'extra.css').read_text(encoding='utf-8')
    head = head.replace('</style></head>', '</style><style id="lz2">\n' + css + '\n</style></head>', 1)
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
