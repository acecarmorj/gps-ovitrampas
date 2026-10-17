import urllib.request
import json

urls = [
    "https://contaovos.com/api/lastcountingpublic?state=RJ&municipality=Carmo",
    "https://contaovos.com/pt-br/api/lastcountingpublic?state=RJ&municipality=Carmo",
    "https://contaovos.com/api/lastcountingpublic?state=RJ",
    "https://contaovos.com/pt-br/api/lastcountingpublic?state=RJ"
]

for url in urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response:
            status = response.status
            content = response.read().decode('utf-8')
            print(f"URL: {url} => Status: {status}, Response length: {len(content)}, Preview: {content[:150]}")
    except Exception as e:
        print(f"URL: {url} => Error: {e}")
