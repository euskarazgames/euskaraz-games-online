#!/usr/bin/env python3
"""LEIZEEN DEIA: pertsonaia berrien ahots-erreferentziak DISEINATU (OmniVoice, "voice design").

Ez da inor klonatzen: erreferentzia bakoitza testu-deskribapen batetik sortzen da (generoa, adina,
tonua), hainbat haziz; onena (UTMOS naturaltasuna + Whisper CER) erref/<pertsonaia>.flac bihurtzen da
eta erref.json-en gordetzen da. Gero sortu.py-k lerro guztiak erreferentzia horren tinbrearekin sortzen ditu.

  venv/bin/python tools/leizeak/ahotsak/diseinua.py --model k2-fsa/OmniVoice \
      [--asr <whisper-eu-ct2>] [--mos <utmos22>] [--who atarrabi,mikelats] [--cands 4]
"""
import argparse, json, pathlib, re, unicodedata

HERE = pathlib.Path(__file__).resolve().parent
NEW = {
    'atarrabi': {'instruct': 'male, young adult, moderate pitch', 'speed': 0.92,
                 'text': 'Leizeek deitzen dizute, sorgin. Lurraren azpitik, kriseiluaren sugarretik hitz egiten dizut.'},
    'mikelats': {'instruct': 'male, middle-aged, low pitch', 'speed': 0.9,
                 'text': 'Kazkabarra nirea da, eta ekaitza ere bai. Zazpi txingarrak nireak izango dira.'},
    'akerbeltz': {'instruct': 'male, elderly, very low pitch', 'speed': 0.88,
                  'text': 'Ongi etorri akelarrera, sorgin txikia. Hemen, gaua ez da inoiz amaitzen.'},
}


def norm(s):
    s = unicodedata.normalize('NFKC', s.lower())
    s = re.sub(r'[^a-zñçü0-9 ]+', ' ', s)
    return ' '.join(s.split())


def edits(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='k2-fsa/OmniVoice')
    ap.add_argument('--asr')
    ap.add_argument('--mos')
    ap.add_argument('--who', help='pertsonaia hauek bakarrik (adib. atarrabi,mikelats)')
    ap.add_argument('--cands', type=int, default=4)
    a = ap.parse_args()

    import numpy as np, soundfile as sf, librosa, torch
    from omnivoice import OmniVoice
    torch.set_num_threads(4)
    model = OmniVoice.from_pretrained(a.model, device_map='cpu', dtype=torch.float32)
    asr = mos = None
    if a.asr:
        from faster_whisper import WhisperModel
        asr = WhisperModel(a.asr, device='cpu', compute_type='int8', cpu_threads=4)
    if a.mos:
        from transformers import AutoModel
        mos = AutoModel.from_pretrained(a.mos, trust_remote_code=True).eval()
    refs_p = HERE / 'erref.json'
    refs = json.loads(refs_p.read_text(encoding='utf-8'))
    whos = a.who.split(',') if a.who else list(NEW)
    for who in whos:
        D = NEW[who]
        best = None
        for k in range(a.cands):
            seed = 2000 + k * 37
            torch.manual_seed(seed)
            w = model.generate(text=D['text'], language='eu', instruct=D['instruct'], speed=D['speed'])[0].astype(np.float32)
            w, _ = librosa.effects.trim(w, top_db=40)
            w16 = librosa.resample(w, orig_sr=24000, target_sr=16000)
            cer, hyp, m = 0.0, '', 3.0
            if asr:
                segs, _ = asr.transcribe(w16, language='eu', beam_size=5)
                hyp = ' '.join(s.text for s in segs).strip()
                cer = edits(norm(D['text']), norm(hyp)) / max(1, len(norm(D['text'])))
            if mos:
                with torch.inference_mode():
                    m = float(mos(torch.from_numpy(w16), sampling_rate=16000).scores[0])
            score = m - 8 * max(0.0, cer - 0.03)
            print(f'{who:10s} hautagaia {k} (hazia {seed}) MOS {m:.2f} CER {cer:.3f} | {hyp}', flush=True)
            if best is None or score > best[0]:
                best = (score, w, seed, m, cer)
        _, w, seed, m, cer = best
        out = HERE / 'erref' / f'{who}.flac'
        sf.write(out, w, 24000)
        refs[who] = {'wav': f'erref/{who}.flac', 'text': D['text'], 'instruct': D['instruct'], 'seed': seed,
                     'speed': D['speed'], 'oharra': f'aurrekuela: diseinatua (UTMOS ≈ {m:.2f}, CER {cer:.3f})'}
        refs_p.write_text(json.dumps(refs, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        print('gordeta:', out.relative_to(HERE.parents[2]), flush=True)


if __name__ == '__main__':
    main()
