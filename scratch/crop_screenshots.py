import os
import glob
from PIL import Image

folder = r"C:\Users\Almir LK\Pictures\Screenshots"
files = sorted(glob.glob(os.path.join(folder, "Captura de tela 2026-10-16 2*.png")))
recent = [f for f in files if any(t in f for t in ["2054", "2056", "2059", "2100", "2101", "2102", "2103"])]

# Let's crop a thumbnail of the map area and the table area for each to identify them
os.makedirs("scratch/screenshot_crops", exist_ok=True)

for i, f in enumerate(recent):
    im = Image.open(f)
    # The map in the web app is roughly from x=270 to x=1080, y=365 to y=1000
    # Or let's crop the map area:
    map_crop = im.crop((260, 360, 1100, 1000))
    # And table crop:
    table_crop = im.crop((1100, 360, 1650, 600))
    
    fname = os.path.basename(f)
    map_crop.save(f"scratch/screenshot_crops/map_{i:02d}_{fname}")
    table_crop.save(f"scratch/screenshot_crops/tab_{i:02d}_{fname}")
    print(f"[{i:02d}] {fname} saved crops.")
