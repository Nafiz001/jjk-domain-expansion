"""Energy envelope + onset analysis of audio takes (decoded via ffmpeg)."""
import subprocess, sys
import numpy as np

def load(path, sr=22050):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32), sr

def envelope(x, sr, hop=0.05):
    n = int(sr * hop)
    frames = len(x) // n
    rms = np.sqrt(np.mean(x[: frames * n].reshape(frames, n) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms), hop

def onsets(db, hop, top=6, min_gap=1.0):
    rise = np.diff(db, prepend=db[0])
    order = np.argsort(rise)[::-1]
    picked = []
    for i in order:
        t = i * hop
        if all(abs(t - p) >= min_gap for p, _ in picked):
            picked.append((t, rise[i]))
        if len(picked) == top:
            break
    return sorted(picked)

def silences(db, hop, thresh=-45, min_len=0.25):
    quiet = db < thresh
    out, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        elif not q and start is not None:
            if (i - start) * hop >= min_len:
                out.append((start * hop, i * hop))
            start = None
    if start is not None and (len(quiet) - start) * hop >= min_len:
        out.append((start * hop, len(quiet) * hop))
    return out

if __name__ == '__main__':
    mode = sys.argv[1]
    for path in sys.argv[2:]:
        x, sr = load(path)
        db, hop = envelope(x, sr)
        if mode == 'music':
            print(path, 'peak dB %.1f' % db.max(), 'onsets:', ', '.join('%.2fs(+%.0f)' % o for o in onsets(db, hop)))
            # coarse loudness per 3s section
            sec = [db[int(s / hop): int((s + 3) / hop)].mean() for s in range(0, int(len(db) * hop), 3)]
            print('   section dB:', ' '.join('%d' % v for v in sec))
        else:
            print(path, 'silences:', ', '.join('%.2f-%.2f' % s for s in silences(db, hop)))
