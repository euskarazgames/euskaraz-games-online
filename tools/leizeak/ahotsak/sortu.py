#!/usr/bin/env python3
"""LEIZEEN DEIA: pertsonaien ahotsak sortu (OmniVoice, euskaraz) → public/assets/voice/leizeak/*.mp3

Ahots guztiak SINTETIKOAK dira: pertsonaia bakoitzaren erreferentzia OmniVoice-ren "voice design"
moduarekin sortu zen (generoa, adina, tonua; inor ez da klonatu), eta lerro guztiak erreferentzia
horren tinbrearekin sortzen dira, ahotsa koherentea izan dadin.

  # behin: python3 -m venv venv && venv/bin/pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
  #        venv/bin/pip install omnivoice faster-whisper transformers
  venv/bin/python tools/leizeak/ahotsak/sortu.py --model k2-fsa/OmniVoice \
      [--asr <whisper-eu-ct2>] [--mos <utmos22>] [--only pro_i1,pro_a1] [--force]

v3 (naturaltasuna, "robotik ez"): ez dago tonu-aldaketarik, oktaba beherako geruzarik ezta isilune
txertaturik ere (horiek ahotsa artifizial egiten zuten: UTMOS-en 3.1 → 1.9). Lerro bakoitzerako
hautagai batzuk sortzen dira (lehena gutiziatsua, besteak laginketa leunarekin) eta onena aukeratzen da:
  --mos: UTMOS22 eredua (naturaltasuna, 1-5; prj-beatrice/utmos22-torch-native, lokalean)
  --asr: euskarazko Whisper eredua (CTranslate2; adib. xezpeleta/whisper-medium-eu-ct2): CER
  puntuazioa = MOS − 8·max(0, CER − 0.03); lehen hautagaia ona bada (MOS ≥ --mos-ok eta
  CER ≤ --cer-ok), ez da gehiago sortzen. Txostenean dagoen emaitza oinarria da: hautagai berri
  batek hobetzen badu bakarrik gainidazten da.
  --pause: esaldi askoko lerroetan ("Amaiur. Entzun… Ez esan ezer.") esaldi-muga bakoitzeko denbora
  gehitzen du; ereduaren iraupen-kalkuluak puntuazioari ia denborarik ez dio ematen, eta azken hitzak
  galtzen ziren.
Lerroak: lerroak.json · erreferentziak: erref/<pertsonaia>.flac + erref.json (speed: antzezpenaren
abiadura). AMONA eta ANDERE pertsonaia bera dira (erreferentzia bera).
Lizentziak: OmniVoice kodea Apache-2.0; aurrez entrenatutako pisuak CC-BY-NC (merkataritzaz kanpo).
"""
import argparse, json, pathlib, re, subprocess, sys, tempfile, unicodedata

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'public/assets/voice/leizeak'
ALIAS = {'amona': 'andere', 'irati?': 'irati'}


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
    ap.add_argument('--only')
    ap.add_argument('--who', help='pertsonaia hauek bakarrik (adib. gaueko,mari)')
    ap.add_argument('--force', action='store_true', help='mp3 dagoeneko badago ere, berriro sortu')
    ap.add_argument('--cands', type=int, default=3, help='lerro bakoitzeko gehienezko hautagaiak')
    ap.add_argument('--mos-ok', type=float, default=3.6)
    ap.add_argument('--cer-ok', type=float, default=0.05)
    ap.add_argument('--temp', type=float, default=0.5, help='2. hautagaitik aurrera: klase-tenperatura')
    ap.add_argument('--slow', type=float, default=0.93, help='2. hautagaitik aurrera: abiadura-biderkatzailea (denbora gehiago: azken hitzak ez galtzeko)')
    ap.add_argument('--pause', type=float, default=0.0, help='esaldi-muga bakoitzeko denbora gehigarria (s; adib. 0.3): ereduak puntuazioari ia denborarik ez dio ematen, eta esaldi askoko lerroetan hitzak galtzen ziren')
    ap.add_argument('--batch', type=int, default=6, help='pertsonaia bereko lerroak batera (CPU-n azkarrago)')
    ap.add_argument('--kbps', default='64k')
    a = ap.parse_args()

    import numpy as np, soundfile as sf, librosa, torch
    from omnivoice import OmniVoice
    from omnivoice.models.omnivoice import OmniVoiceGenerationConfig
    torch.set_num_threads(4)
    lines = json.loads((HERE / 'lerroak.json').read_text(encoding='utf-8'))
    refs = json.loads((HERE / 'erref.json').read_text(encoding='utf-8'))
    only = set(a.only.split(',')) if a.only else None
    whos = set(a.who.split(',')) if a.who else None
    model = OmniVoice.from_pretrained(a.model, device_map='cpu', dtype=torch.float32)
    asr = mos = None
    if a.asr:
        from faster_whisper import WhisperModel
        asr = WhisperModel(a.asr, device='cpu', compute_type='int8', cpu_threads=4)
    if a.mos:
        from transformers import AutoModel
        mos = AutoModel.from_pretrained(a.mos, trust_remote_code=True).eval()
    OUT.mkdir(parents=True, exist_ok=True)
    report_p = HERE / 'txostena.json'
    report = json.loads(report_p.read_text(encoding='utf-8')) if report_p.exists() else {}

    def check(text, w):
        """(CER, transkripzioa, MOS) — jokalariak entzungo duen fitxategiaren gainean."""
        w16 = librosa.resample(w, orig_sr=24000, target_sr=16000)
        cer, hyp, m = 0.0, '', 3.0
        if asr:
            segs, _ = asr.transcribe(w16, language='eu', beam_size=5)
            hyp = ' '.join(s.text for s in segs).strip()
            cer = edits(norm(text), norm(hyp)) / max(1, len(norm(text)))
        if mos:
            with torch.inference_mode():
                m = float(mos(torch.from_numpy(w16), sampling_rate=16000).scores[0])
        return cer, hyp, m

    def clean(w):
        """Ertzetako isiluneak kendu eta leunki sartu/irten (ez dago beste prozesaketarik)."""
        w, _ = librosa.effects.trim(w, top_db=40)
        f = min(len(w) // 4, int(0.012 * 24000))
        if f > 0:
            ramp = np.linspace(0, 1, f, dtype=np.float32)
            w[:f] *= ramp
            w[-f:] *= ramp[::-1]
        return w.astype(np.float32)

    score = lambda c: c['mos'] - 8 * max(0.0, c['cer'] - 0.03)

    def save(lid, who, c):
        pad = np.zeros(int(0.06 * 24000), np.float32)
        wav = np.concatenate([pad, c['w'], pad])
        rms = float(np.sqrt(np.mean(wav ** 2))) or 1e-4
        wav = wav * min(0.1 / rms, 0.95 / (float(np.abs(wav).max()) or 1))
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            sf.write(f.name, wav, 24000)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f.name, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', a.kbps, str(OUT / f'{lid}.mp3')], check=True)
        report[lid] = {'who': who, 'text': lines[lid][1], 'mos': round(c['mos'], 2), 'cer': round(c['cer'], 3), 'cand': c['k'], 'seed': c['seed'], 'dur': round(len(wav) / 24000, 2), 'asr': c['hyp']}
        report_p.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')

    todo = {}
    for lid, (who, text) in lines.items():
        if (only and lid not in only) or (not a.force and not only and (OUT / f'{lid}.mp3').exists()):
            continue
        key = ALIAS.get(who.lower(), who.lower())
        if whos and key not in whos:
            continue
        if key not in refs:
            print('erreferentziarik ez:', who, file=sys.stderr)
            continue
        todo.setdefault(key, []).append(lid)
    for key, ids in todo.items():
        R = refs[key]
        prompt = model.create_voice_clone_prompt(ref_audio=str(HERE / R['wav']), ref_text=R['text'])
        fr = model.audio_tokenizer.config.frame_rate

        def dur(text, sp):
            """Iraupena (s): ereduaren kalkulua (erreferentziaren erritmoa) + esaldi-mugetako etenak."""
            est = model._estimate_target_tokens(text, prompt.ref_text, prompt.ref_audio_tokens.size(-1), speed=sp) / fr
            return est + a.pause * len(re.findall(r'[.?!…]+\s+(?=\S)', text))
        best, pending = {}, list(ids)
        # aurreko emaitza (txostena) oinarri gisa: hautagai berri batek hobetzen badu bakarrik gainidatzi
        # (testua aldatu bada edo --force, ez)
        for lid in ids:
            prev = report.get(lid)
            if not a.force and prev and 'mos' in prev and prev.get('text', lines[lid][1]) == lines[lid][1] and (OUT / f'{lid}.mp3').exists():
                best[lid] = {'mos': prev['mos'], 'cer': prev['cer'], 'k': prev.get('cand', -1), 'seed': prev.get('seed'), 'hyp': prev.get('asr', '')}
        ok = lambda l: l in best and best[l]['mos'] >= a.mos_ok and best[l]['cer'] <= a.cer_ok
        pending = [l for l in ids if not ok(l)]
        for k in range(a.cands):
            if not pending:
                break
            cfg = OmniVoiceGenerationConfig(class_temperature=0.0 if k == 0 else a.temp)
            for i in range(0, len(pending), a.batch):
                chunk = pending[i:i + a.batch]
                seed = R.get('seed', 7) * 100 + k * 31 + i
                torch.manual_seed(seed)
                sp = R.get('speed', 1.0) * (a.slow if k else 1.0)
                texts = [lines[l][1] for l in chunk]
                wavs = model.generate(text=texts, language=['eu'] * len(chunk), voice_clone_prompt=[prompt] * len(chunk), duration=[dur(t, sp) for t in texts], generation_config=cfg)
                for lid, w in zip(chunk, wavs):
                    w = clean(w.astype(np.float32))
                    cer, hyp, m = check(lines[lid][1], w)
                    c = {'w': w, 'cer': cer, 'hyp': hyp, 'mos': m, 'k': k, 'seed': seed}
                    print(f'{lid:9s} {key:7s} hautagaia {k} MOS {m:.2f} CER {cer:.3f} | {hyp}', flush=True)
                    # hobea bada, berehala gorde (prozesua eten arren, aurrerapena ez da galtzen)
                    if lid not in best or score(c) > score(best[lid]):
                        best[lid] = c
                        save(lid, lines[lid][0], c)
            pending = [l for l in pending if not ok(l)]
    print('eginda:', len(report), 'lerro')


if __name__ == '__main__':
    main()
