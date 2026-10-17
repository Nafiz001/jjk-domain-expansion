"""Grades new character art toward its domain's palette and installs it as that domain's frame_0."""
import shutil, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FRAMES = ROOT / 'public' / 'assets' / 'frames'
BACKUP = Path(__file__).parent / 'replaced'

# art file -> (domain, blend strength toward the domain's mean colour, shadow gamma)
JOBS = {
    'yuta.jpg': ('authentic-mutual-love', 0.6, 1.18),
    'hakari.jpg': ('idle-death-gamble', 0.45, 1.05),
    'mahito.jpg': ('self-embodiment-of-perfection', 0.45, 1.05),
}

def domain_mean(domain):
    means = [np.asarray(Image.open(FRAMES / domain / f'frame_{i}.jpg').convert('RGB').resize((256, 144)), dtype=np.float32).reshape(-1, 3).mean(0) for i in range(1, 6)]
    return np.mean(means, axis=0)

def cover_crop(im, w=1280, h=720):
    src_w, src_h = im.size
    scale = max(w / src_w, h / src_h)
    im = im.resize((round(src_w * scale), round(src_h * scale)), Image.LANCZOS)
    left = (im.width - w) // 2
    top = (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))

BACKUP.mkdir(exist_ok=True)
for name, (domain, strength, gamma) in JOBS.items():
    target = domain_mean(domain)
    img = Image.open(Path(__file__).parent / name).convert('RGB')
    arr = np.asarray(img, dtype=np.float32)
    src = arr.reshape(-1, 3).mean(0)
    gains = 1 + strength * (target / np.maximum(src, 1) - 1)
    graded = np.clip(arr * gains, 0, 255) / 255.0
    graded = np.power(graded, gamma) * 255.0
    out = cover_crop(Image.fromarray(graded.astype(np.uint8)))
    dest = FRAMES / domain / 'frame_0.jpg'
    backup = BACKUP / f'{domain}-frame_0.jpg'
    if not backup.exists():
        shutil.copy2(dest, backup)
    out.save(dest, quality=90, optimize=True)
    print(f'{name} -> {dest.relative_to(ROOT)}  gains={np.round(gains, 2)}  mean {np.round(src)} -> {np.round(np.asarray(out, dtype=np.float32).reshape(-1, 3).mean(0))} (domain {np.round(target)})')
