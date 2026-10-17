import urllib.request
import json

url = "https://contaovos.com/api/lastcountingpublic?state=RJ&municipality=Carmo"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

print(f"Total records returned: {len(data)}")
if len(data) > 0:
    print("\nFirst record structure:")
    print(json.dumps(data[0], indent=2, ensure_ascii=False))
    print("\nSecond record structure:")
    print(json.dumps(data[1], indent=2, ensure_ascii=False))
