import requests
import re

for site in ['https://gps-ovitrampas-demo.pages.dev', 'https://gps-ovitrampas.pages.dev']:
    try:
        html = requests.get(site, timeout=5).text
        scripts = re.findall(r'assets/[^"\'>]+\.js', html)
        print(site, "-> Scripts:", scripts)
    except Exception as e:
        print(site, "Error:", e)
