import re
import json
from collections import defaultdict

with open('traps_clean_utf8.json', 'r', encoding='utf-8') as f:
    traps = json.load(f)

with open('backups/d1_emissao_SES_20261001_1217.sql', encoding='utf-8', errors='ignore') as f:
    sql = f.read()

pattern = re.compile(r"INSERT INTO \"readings\" [^V]*VALUES\('([^']*)','([^']*)','([^']*)','([^']*)',(\d+),(\d+)")
matches = pattern.findall(sql)

readings_by_num = defaultdict(dict)
for m in matches:
    _, _, num, palheta, ovos, _ = m
    n_clean = str(int(num)) if num.isdigit() else num
    readings_by_num[n_clean][palheta] = int(ovos)

for t in traps:
    raw_num = t.get('numero', '')
    n_clean = str(int(raw_num)) if raw_num.isdigit() else raw_num
    pals = readings_by_num[n_clean]
    a = 0
    b = 0
    for p, v in pals.items():
        if p.endswith('A'): a = v
        elif p.endswith('B'): b = v
    soma = a + b
    t['ovos_a'] = a
    t['ovos_b'] = b
    t['ovos_soma'] = soma

# Group by district/bairro
by_loc = defaultdict(list)
for t in traps:
    by_loc[t.get('bairro', 'Outro')].append(t)

print("=== RESUMO POR LOCALIDADE ===")
for loc, t_list in sorted(by_loc.items()):
    total_ovos = sum(x['ovos_soma'] for x in t_list)
    print(f"\n[{loc}] Total armadilhas: {len(t_list)} | Total Ovos (A+B): {total_ovos}")
    for x in sorted(t_list, key=lambda k: int(k['numero'])):
        print(f"   OV-{int(x['numero']):02d}: Sem A={x['ovos_a']:>3}, Sem B={x['ovos_b']:>3} -> TOTAL={x['ovos_soma']:>3} ovos | {x['moradorNome']} ({x['rua']}) | lat={x['latitude']}, lng={x['longitude']}")
