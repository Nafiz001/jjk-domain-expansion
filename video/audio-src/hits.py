import sys
sys.path.insert(0, '.')
import numpy as np
from analyze import load, envelope

def first_jump(db, after, thresh):
    rise = np.diff(db)
    for i in range(int(after / 0.01), len(rise)):
        if db[i + 1] > thresh and rise[i] > 6:
            return (i + 1) * 0.01

x, sr = load('music-trailer-a.mp3'); db, _ = envelope(x, sr, hop=0.01)
print('trailer A main impact ~%.2fs' % first_jump(db, 1.5, -25))
late = db[2500:2850]; print('trailer A final hit ~%.2fs' % (25 + (np.argmax(np.diff(late)) + 1) * 0.01))
for f in sys.argv[1:]:
    x, sr = load(f); db, _ = envelope(x, sr, hop=0.01)
    print(f, 'speech starts %.2fs, peak %.1f dB' % (np.argmax(db > -40) * 0.01, db.max()))
