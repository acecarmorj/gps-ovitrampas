import json

with open('src/lib/trapsOficiaisCarmo.json', 'r', encoding='utf-8') as f:
    traps = {int(t['numero']): t for t in json.load(f)}

with open('src/lib/readingsOficiaisCarmo.json', 'r', encoding='utf-8') as f:
    readings = json.load(f)

# Build paired map
paired = {}
for r in readings:
    num = int(r.get('numero_armadilha', 0))
    palheta = (r.get('numero_palheta') or '').upper()
    ciclo = 'B' if 'B' in palheta else 'A'
    # Keep most recent
    key = (num, ciclo)
    data = r.get('lida_em') or ''
    if key not in paired or data > (paired[key].get('lida_em') or ''):
        paired[key] = r

ranking = []
for num in range(1, 57):
    t = traps.get(num, {})
    rA = paired.get((num, 'A'), {})
    rB = paired.get((num, 'B'), {})
    ovA = int(rA.get('ovos', 0))
    ovB = int(rB.get('ovos', 0))
    total = ovA + ovB
    
    ranking.append({
        'num': num,
        'ov': f'OV-{num:02d}',
        'ovA': ovA,
        'ovB': ovB,
        'total': total,
        'bairro': t.get('bairro', ''),
        'quarteirao': t.get('quarteirao', ''),
        'morador': t.get('morador_nome', ''),
        'rua': t.get('rua', ''),
        'numero': t.get('numero_imovel', ''),
        'lat': t.get('latitude'),
        'lng': t.get('longitude')
    })

ranking.sort(key=lambda x: x['total'], reverse=True)

print('=== TOP 15 CRÍTICOS (TOTAL OVOS) ===')
for item in ranking[:15]:
    print(f"{item['ov']} | {item['bairro']} | {item['quarteirao']} | Total: {item['total']} (Ciclo A: {item['ovA']} | Ciclo B: {item['ovB']}) | {item['rua']}, {item['numero']} ({item['morador']})")

print('\n=== TOTAIS POR BAIRRO/DISTRITO ===')
bairros = {}
for item in ranking:
    b = item['bairro']
    if b not in bairros:
        bairros[b] = {'total_ovos': 0, 'ovos_A': 0, 'ovos_B': 0, 'armadilhas': 0, 'positivas': 0, 'itens': []}
    bairros[b]['total_ovos'] += item['total']
    bairros[b]['ovos_A'] += item['ovA']
    bairros[b]['ovos_B'] += item['ovB']
    bairros[b]['armadilhas'] += 1
    if item['total'] > 0:
        bairros[b]['positivas'] += 1
    bairros[b]['itens'].append(item)

for b, d in sorted(bairros.items(), key=lambda x: x[1]['total_ovos'], reverse=True):
    print(f"{b}: {d['total_ovos']} ovos (A: {d['ovos_A']} | B: {d['ovos_B']}) | {d['armadilhas']} OVs ({d['positivas']} pos)")
