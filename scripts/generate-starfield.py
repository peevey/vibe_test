"""Create the original CC0 starfield; requires Python 3 and Pillow 12.3.0."""
import base64
import io
import math
import random
import re
from pathlib import Path
from PIL import Image

rng = random.Random(48)
size = 1920
image = Image.new('RGB', (size, size), (7, 11, 26))
pixels = image.load()
# Independent continuous positions, mostly faint stars, a few brighter stars.
for _ in range(1900):
    x, y = rng.uniform(0, size), rng.uniform(0, size)
    bright = rng.random() ** 3
    amplitude = 30 + 205 * bright
    sigma = rng.uniform(0.35, 0.7) + 0.5 * bright
    tint = rng.choice([(0.8, 0.88, 1), (1, 0.94, 0.84), (0.95, 0.97, 1)])
    radius = math.ceil(sigma * 4)
    for py in range(max(0, int(y) - radius), min(size, int(y) + radius + 1)):
        for px in range(max(0, int(x) - radius), min(size, int(x) + radius + 1)):
            distance = (px - x) ** 2 + (py - y) ** 2
            light = amplitude * math.exp(-distance / (2 * sigma ** 2))
            pixels[px, py] = tuple(min(255, round(c + light * t)) for c, t in zip(pixels[px, py], tint))
encoded = io.BytesIO()
image.save(encoded, format='WEBP', quality=88, method=6)
data = base64.b64encode(encoded.getvalue()).decode('ascii')
page = Path(__file__).resolve().parents[1] / 'index.html'
html = page.read_text()
html, count = re.subn(r'(?<=background-image: url\(")data:image/webp;base64,[^"]+', 'data:image/webp;base64,' + data, html)
if count != 1:
    raise RuntimeError('Expected exactly one embedded starfield')
page.write_text(html)
print(f'Embedded {size} × {size} WebP: {len(encoded.getvalue())} bytes')
