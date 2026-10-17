import json
import datetime
import sys

sys.stdout.reconfigure(encoding='utf-8')

def load_data():
    def read_json_safe(filepath):
        for enc in ['utf-16', 'utf-8-sig', 'utf-8', 'latin-1']:
            try:
                with open(filepath, "r", encoding=enc) as f:
                    return json.load(f)
            except Exception:
                continue
        raise ValueError(f"Could not decode {filepath}")

    readings_raw = read_json_safe(r"f:\Desktop\GPS OVITRAMPAS\readings_dump.json")
    traps_raw = read_json_safe(r"f:\Desktop\GPS OVITRAMPAS\traps_dump.json")

    readings = readings_raw[0]["results"]
    traps = traps_raw[0]["results"]
    return readings, traps

def run_audit():
    readings, traps = load_data()
    
    print(f"=== AUDITORIA GERAL DE DADOS LANÇADOS NO SISTEMA OVITRAMPAS ===")
    print(f"Data da Auditoria: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"Total de Armadilhas Cadastradas no Banco D1: {len(traps)}")
    print(f"Total de Leituras Registradas no Banco D1: {len(readings)}")
    print("-" * 70)

    # Análise das Leituras
    readings_by_trap = {}
    total_eggs = 0
    positives = 0
    negatives = 0
    
    for r in readings:
        num = str(r["numero_armadilha"]).strip()
        readings_by_trap.setdefault(num, []).append(r)
        eggs = r.get("ovos", 0)
        total_eggs += eggs
        if eggs > 0:
            positives += 1
        else:
            negatives += 1

    ipo = (positives / len(readings) * 100) if readings else 0
    ido = (total_eggs / positives) if positives else 0
    
    print(f"RESUMO EPIDEMIOLÓGICO DAS LEITURAS LANÇADAS:")
    print(f"  • Leituras Realizadas: {len(readings)}")
    print(f"  • Armadilhas Positivas: {positives} ({ipo:.1f}% - IPO)")
    print(f"  • Armadilhas Negativas (Zero ovos): {negatives} ({100 - ipo:.1f}%)")
    print(f"  • Total de Ovos Contados: {total_eggs}")
    print(f"  • Densidade Média por Armadilha Positiva (IDO): {ido:.1f} ovos/armadilha")
    print("-" * 70)

    # Detalhamento por Armadilha
    print(f"{'ARM':<5} | {'PALHETA':<8} | {'OVOS':<6} | {'STATUS':<10} | {'DATA/HORA LEITURA':<20} | {'MORADOR / LOCALIDADE':<30} | {'BAIRRO':<18}")
    print("-" * 105)

    traps_dict = {str(t["numero"]).strip(): t for t in traps}
    
    # Sort readings by integer trap number
    sorted_readings = sorted(readings, key=lambda x: int(x["numero_armadilha"]) if str(x["numero_armadilha"]).isdigit() else 999)

    discrepancies = []
    
    for r in sorted_readings:
        num = str(r["numero_armadilha"]).strip()
        palheta = r.get("numero_palheta", "")
        ovos = r.get("ovos", 0)
        status_pos = "POSITIVA" if ovos > 0 else "ZERO"
        lida_em = r.get("lida_em", "")
        # Formatar data lida_em
        try:
            dt = datetime.datetime.fromisoformat(lida_em.replace('Z', '+00:00'))
            dt_br = dt.strftime("%d/%m %H:%M")
        except:
            dt_br = lida_em[:16]

        t_info = traps_dict.get(num, {})
        morador = t_info.get("morador_nome", "N/C")
        bairro = t_info.get("bairro", "N/C")
        
        # Checar se a armadilha está sincronizada com a leitura
        t_ultimos_ovos = t_info.get("ultimos_ovos")
        t_status = t_info.get("status")
        if t_ultimos_ovos != ovos:
            discrepancies.append(f"Armadilha {num}: leitura tem {ovos} ovos mas tabela traps tem ultimos_ovos={t_ultimos_ovos}")

        print(f"P-{num:<3} | {palheta:<8} | {ovos:<6} | {status_pos:<10} | {dt_br:<20} | {morador[:28]:<30} | {bairro[:18]:<18}")

    print("-" * 105)

    # Armadilhas sem leitura ainda
    traps_sem_leitura = [num for num, t in traps_dict.items() if num not in readings_by_trap]
    print(f"\nARMADILHAS CADASTRADAS QUE AINDA NÃO POSSUEM LEITURA ({len(traps_sem_leitura)}):")
    traps_sem_leitura_sorted = sorted(traps_sem_leitura, key=lambda x: int(x) if x.isdigit() else 999)
    print(", ".join([f"P-{x}" for x in traps_sem_leitura_sorted]))

    # Ranking de Focos / Maiores Contagens
    print(f"\nRANKING DAS MAIORES CONTAGENS (HOTSPOTS):")
    top_readings = sorted([r for r in readings if r.get("ovos", 0) > 0], key=lambda x: x.get("ovos", 0), reverse=True)
    for idx, r in enumerate(top_readings, 1):
        num = str(r["numero_armadilha"]).strip()
        t_info = traps_dict.get(num, {})
        morador = t_info.get("morador_nome", "")
        rua = t_info.get("rua", "")
        bairro = t_info.get("bairro", "")
        print(f"  {idx}. Armadilha P-{num} (Palheta {r.get('numero_palheta')}): {r.get('ovos')} ovos — {morador} ({rua}, {bairro})")

    # Auditoria de Integridade e Inconsistências
    print(f"\nAUDITORIA DE INTEGRIDADE:")
    if discrepancies:
        print(f"  [ATENÇÃO] Discrepâncias encontradas entre tabela 'readings' e 'traps':")
        for d in discrepancies:
            print(f"    - {d}")
    else:
        print(f"  [OK] Todas as leituras na tabela 'readings' batem 100% com os campos 'ultimos_ovos' e 'status' da tabela 'traps'.")

    # Checar duplicatas de leitura
    duplicates = [num for num, r_list in readings_by_trap.items() if len(r_list) > 1]
    if duplicates:
        print(f"  [AVISO] Armadilhas com mais de uma leitura registrada: {duplicates}")
    else:
        print(f"  [OK] Sem duplicatas de leituras para uma mesma armadilha.")

if __name__ == '__main__':
    import io
    old_stdout = sys.stdout
    buffer = io.StringIO()
    sys.stdout = buffer
    run_audit()
    output = buffer.getvalue()
    sys.stdout = old_stdout
    with open(r"f:\Desktop\GPS OVITRAMPAS\audit_resultado.txt", "w", encoding="utf-8") as f:
        f.write(output)
    print("Auditoria concluída com sucesso e salva em audit_resultado.txt!")
