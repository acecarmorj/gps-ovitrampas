import re
import json
from collections import defaultdict

with open(r'backups/d1_emissao_SES_20261001_1217.sql', encoding='utf-8', errors='ignore') as f:
    sql = f.read()

pattern = re.compile(r"INSERT INTO readings VALUES\('([^']*)','([^']*)','([^']*)','([^']*)',(\d+),(\d+)")
matches = pattern.findall(sql)
print(f"Total readings extracted: {len(matches)}")

readings_by_trap = defaultdict(dict)
for m in matches:
    _, _, num, palheta, ovos, _ = m
    readings_by_trap[num][palheta] = int(ovos)

print("\n--- DETALHAMENTO DE OVOS (CICLO A, CICLO B, SOMA) ---")
for num in sorted(readings_by_trap.keys(), key=lambda x: int(x) if x.isdigit() else 999):
    pals = readings_by_trap[num]
    a = pals.get(f"{int(num):02d}A", pals.get(f"{num}A", 0))
    b = pals.get(f"{int(num):02d}B", pals.get(f"{num}B", 0))
    soma = a + b
    if num in ['23', '10', '05', '5', '31', '35', '36', '37', '38', '41', '45', '50', '51', '52'] or soma > 50:
        print(f"OV-{num:>2}: Sem A (Ciclo 1) = {a:>3} ovos | Sem B (Ciclo 2) = {b:>3} ovos | SOMA (Ambas) = {soma:>3} ovos | Detalhe={pals}")
