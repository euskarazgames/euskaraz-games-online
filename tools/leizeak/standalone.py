#!/usr/bin/env python3
"""LEIZEEN DEIA fitxategi bakarrean (zerbitzaririk gabe irekitzeko):
egfx.js, jokoak behar dituen testurak/zeruak eta pertsonaien ahotsak barruan, data-URI gisa.

  python3 tools/leizeak/standalone.py /tmp/LEIZEEN_DEIA.html
"""
import base64, json, pathlib, sys

R = pathlib.Path(__file__).resolve().parents[2] / 'public'
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'LEIZEEN_DEIA.html')
html = (R / 'games/leizeak.html').read_text(encoding='utf-8')
need = ['tex/%s_%s.jpg' % (k, m) for k, ms in [('grass', 'cnr'), ('snow', 'cn'), ('cliff', 'cnr'), ('planks', 'cnr')] for m in ms]
need += ['tex/water_n.jpg', 'sky/dusk.jpg', 'sky/day.jpg', 'sky/night.jpg']
inline = {p: 'data:image/jpeg;base64,' + base64.b64encode((R / 'assets' / p).read_bytes()).decode() for p in need}
egfx = (R / 'assets/egfx.js').read_text(encoding='utf-8')
tag = '<script src="/assets/egfx.js"></script>'
assert html.count(tag) == 1
html = html.replace(tag, '<script>window.EGFX_INLINE=' + json.dumps(inline) + ';</script>\n<script>' + egfx + '</script>')
# pertsonaien ahotsak (mp3) ere barruan: ahotsak.js-ek window.LEIZEAK_VOICES begiratzen du lehenik
voices = {f.stem: 'data:audio/mpeg;base64,' + base64.b64encode(f.read_bytes()).decode() for f in sorted((R / 'assets/voice/leizeak').glob('*.mp3'))}
if voices:
    html = html.replace('<script>window.EGFX_INLINE=', '<script>window.LEIZEAK_VOICES=' + json.dumps(voices) + ';</script>\n<script>window.EGFX_INLINE=', 1)
out.write_text(html, encoding='utf-8')
print(out, out.stat().st_size)
