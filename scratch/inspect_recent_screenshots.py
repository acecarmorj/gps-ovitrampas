import os
import glob
from PIL import Image

folder = r"C:\Users\Almir LK\Pictures\Screenshots"
files = sorted(glob.glob(os.path.join(folder, "Captura de tela 2026-10-16 2*.png")))

recent = [f for f in files if any(t in f for t in ["2054", "2056", "2059", "2100", "2101", "2102", "2103"])]

print(f"Total recent screenshots: {len(recent)}")
for f in recent:
    im = Image.open(f)
    print(f"{os.path.basename(f)}: size={im.size}, mode={im.mode}")
