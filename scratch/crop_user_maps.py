import os
import glob
from PIL import Image

folder = r"C:\Users\Almir LK\Pictures\Screenshots"
files = sorted(glob.glob(os.path.join(folder, "Captura de tela 2026-10-16 2*.png")))
recent = [f for f in files if any(t in f for t in ["2054", "2056", "2059", "2100", "2101", "2102", "2103", "2107"])]

# In 1920x1032, where is the map located?
# Looking at the user's screenshot:
# Left margin of the map: x=270
# Right margin of the map: x=1083
# Top of the map: y=348
# Bottom of the map: y=984
# Dimensions: width = 1083 - 270 = 813 px, height = 984 - 348 = 636 px.

os.makedirs("scratch/user_prints_clean", exist_ok=True)

for i, f in enumerate(recent):
    im = Image.open(f)
    # Let's crop the map viewport exactly
    # In Leaflet, the map container is inside the card
    # Let's check coordinates:
    crop_map = im.crop((270, 348, 1083, 984))
    fname = os.path.basename(f)
    crop_map.save(f"scratch/user_prints_clean/print_{i:02d}_{fname}")
    print(f"[{i:02d}] {fname} -> {crop_map.size}")
