#!/usr/bin/env python3
"""OIHARTZUN fitxategi bakarrean (zerbitzaririk gabe irekitzeko):
egfx.js eta jokoak behar dituen testurak/zeruak barruan, data-URI gisa.

  python3 tools/oihartzun/standalone.py /tmp/OIHARTZUN.html
"""
import base64, json, pathlib, sys

R = pathlib.Path(__file__).resolve().parents[2] / 'public'
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'OIHARTZUN.html')
html = (R / 'games/oihartzun.html').read_text(encoding='utf-8')
need = ['tex/%s_%s.jpg' % (k, m) for k, ms in [('grass', 'cnr'), ('snow', 'cn'), ('cliff', 'cnr')] for m in ms]
need += ['tex/water_n.jpg', 'sky/dusk.jpg', 'sky/night.jpg']
inline = {p: 'data:image/jpeg;base64,' + base64.b64encode((R / 'assets' / p).read_bytes()).decode() for p in need}
egfx = (R / 'assets/egfx.js').read_text(encoding='utf-8')
tag = '<script src="/assets/egfx.js"></script>'
assert html.count(tag) == 1
html = html.replace(tag, '<script>window.EGFX_INLINE=' + json.dumps(inline) + ';</script>\n<script>' + egfx + '</script>\n<style>#legacy{display:none}</style>')
out.write_text(html, encoding='utf-8')
print(out, out.stat().st_size)
