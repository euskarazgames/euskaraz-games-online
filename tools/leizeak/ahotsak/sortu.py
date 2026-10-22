#!/usr/bin/env python3
"""LEIZEEN DEIA: pertsonaien ahotsak sortu (OmniVoice, euskaraz) → public/assets/voice/leizeak/*.mp3

Ahots guztiak SINTETIKOAK dira: pertsonaia bakoitzaren erreferentzia OmniVoice-ren "voice design"
moduarekin sortu zen (generoa, adina, tonua; inor ez da klonatu), eta lerro guztiak erreferentzia
horren tinbrearekin sortzen dira, ahotsa koherentea izan dadin.

  # behin: python3 -m venv venv && venv/bin/pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
  #        venv/bin/pip install omnivoice faster-whisper
  venv/bin/python tools/leizeak/ahotsak/sortu.py --model k2-fsa/OmniVoice [--asr <whisper-eu-ct2>] [--only pro_i1,pro_a1]

--asr: euskarazko Whisper eredua (CTranslate2; adib. xezpeleta/whisper-medium-eu-ct2). Emanez gero,
lerro bakoitza transkribatu eta testuarekin alderatzen da (CER); txarra bada, beste hazi batekin
berriro sortzen da. Lerroak: lerroak.json · erreferentziak: erref/<pertsonaia>.flac + erref.json.
Lizentziak: OmniVoice kodea Apache-2.0; aurrez entrenatutako pisuak CC-BY-NC (merkataritzaz kanpo).
"""
import argparse, json, pathlib, re, subprocess, sys, tempfile, unicodedata

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'public/assets/voice/leizeak'


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
    ap.add_argument('--only')
    ap.add_argument('--force', action='store_true', help='mp3 dagoeneko badago ere, berriro sortu')
    ap.add_argument('--tries', type=int, default=3)
    ap.add_argument('--cer', type=float, default=0.08)
    ap.add_argument('--batch', type=int, default=6, help='pertsonaia bereko lerroak batera (CPU-n azkarrago)')
    ap.add_argument('--kbps', default='48k')
    ap.add_argument('--speed', type=float, default=1.0, help='<1: astiroago (denbora gehiago testu osorako)')
    a = ap.parse_args()

    import numpy as np, soundfile as sf, librosa, torch
    from omnivoice import OmniVoice
    torch.set_num_threads(4)
    lines = json.loads((HERE / 'lerroak.json').read_text(encoding='utf-8'))
    refs = json.loads((HERE / 'erref.json').read_text(encoding='utf-8'))
    only = set(a.only.split(',')) if a.only else None
    model = OmniVoice.from_pretrained(a.model, device_map='cpu', dtype=torch.float32)
    asr = None
    if a.asr:
        from faster_whisper import WhisperModel
        asr = WhisperModel(a.asr, device='cpu', compute_type='int8', cpu_threads=4)
    OUT.mkdir(parents=True, exist_ok=True)
    report_p = HERE / 'txostena.json'
    report = json.loads(report_p.read_text(encoding='utf-8')) if report_p.exists() else {}
    prompts = {}

    def check(text, wav):
        if not asr:
            return 0.0, ''
        segs, _ = asr.transcribe(librosa.resample(wav, orig_sr=24000, target_sr=16000), language='eu', beam_size=5)
        hyp = ' '.join(s.text for s in segs).strip()
        return edits(norm(text), norm(hyp)) / max(1, len(norm(text))), hyp

    def save(lid, who, wav, cer, seed, hyp):
        # isiltasuna moztu, betegarri txikia eta bolumena berdindu
        wav, _ = librosa.effects.trim(wav, top_db=38)
        pad = np.zeros(int(0.06 * 24000), np.float32)
        wav = np.concatenate([pad, wav, pad])
        rms = float(np.sqrt(np.mean(wav ** 2))) or 1e-4
        wav = wav * min(0.1 / rms, 0.95 / (float(np.abs(wav).max()) or 1))
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            sf.write(f.name, wav, 24000)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f.name, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', a.kbps, str(OUT / f'{lid}.mp3')], check=True)
        report[lid] = {'who': who, 'cer': round(cer, 3), 'seed': seed, 'dur': round(len(wav) / 24000, 2), 'asr': hyp}
        report_p.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')

    todo = {}
    for lid, (who, text) in lines.items():
        if (only and lid not in only) or (not a.force and not only and (OUT / f'{lid}.mp3').exists()):
            continue
        if who.lower() not in refs:
            print('erreferentziarik ez:', who, file=sys.stderr)
            continue
        todo.setdefault(who.lower(), []).append(lid)
    for key, ids in todo.items():
        R = refs[key]
        if key not in prompts:
            prompts[key] = model.create_voice_clone_prompt(ref_audio=str(HERE / R['wav']), ref_text=R['text'])
        best = {}
        pending = list(ids)
        for k in range(a.tries):
            if not pending:
                break
            for i in range(0, len(pending), a.batch):
                chunk = pending[i:i + a.batch]
                seed = R.get('seed', 7) * 100 + k * 31 + i
                torch.manual_seed(seed)
                texts = [lines[l][1] for l in chunk]
                # berriro saiatzean, denbora pixka bat gehiago: azken hitzak ez dira galtzen
                sp = a.speed * (0.92 if k else 1.0)
                wavs = model.generate(text=texts, language=['eu'] * len(chunk), voice_clone_prompt=[prompts[key]] * len(chunk), speed=[sp] * len(chunk))
                for lid, w in zip(chunk, wavs):
                    w = w.astype(np.float32)
                    cer, hyp = check(lines[lid][1], w)
                    print(f'{lid:9s} {key:7s} saiakera {k} CER {cer:.3f} | {hyp}', flush=True)
                    # hobea bada, berehala gorde (prozesua eten arren, aurrerapena ez da galtzen)
                    if lid not in best or cer < best[lid][0]:
                        best[lid] = (cer, w, seed, hyp)
                        save(lid, lines[lid][0], w, cer, seed, hyp)
            pending = [l for l in pending if best[l][0] > a.cer]
    print('eginda:', len(report), 'lerro')


if __name__ == '__main__':
    main()
