import urllib.request
import json

endpoints = [
    "https://contaovos.com/api/getmunicipalityovitrapspublic?state=RJ&municipality=Carmo",
    "https://contaovos.com/api/getmunicipalityplacespublic?state=RJ&municipality=Carmo",
    "https://contaovos.com/api/getmunicipalityblockspublic-2?state=RJ&municipality=Carmo"
]

for ep in endpoints:
    try:
        req = urllib.request.Request(ep, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"Endpoint: {ep}\n  Count: {len(data)}")
            if len(data) > 0:
                print(f"  Sample: {json.dumps(data[0], ensure_ascii=False)[:200]}")
    except Exception as e:
        print(f"Endpoint: {ep} => Error: {e}")
