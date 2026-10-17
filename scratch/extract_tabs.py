import os
import glob
from PIL import Image

folder = r"C:\Users\Almir LK\Pictures\Screenshots"
files = sorted(glob.glob(os.path.join(folder, "Captura de tela 2026-10-16 2*.png")))
recent = [f for f in files if any(t in f for t in ["2054", "2056", "2059", "2100", "2101", "2102", "2103", "2107"])]

# Let's crop the title/stats bar and the search/table top to see the district name
os.makedirs("scratch/user_table_crops", exist_ok=True)
for i, f in enumerate(recent):
    im = Image.open(f)
    # The search bar and top 3 rows of table are around x=1100..1650, y=360..580
    tab = im.crop((1100, 360, 1650, 580))
    tab.save(f"scratch/user_table_crops/tab_{i:02d}.png")
    # Top stats bar: x=260..1080, y=230..310
    stats = im.crop((260, 230, 1080, 310))
    stats.save(f"scratch/user_table_crops/stats_{i:02d}.png")

print("Saved all table and stats crops.")
