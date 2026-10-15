#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Aplicação das Correções de Campo das 56 Ovitrampas de Carmo-RJ
Transcritas com precisão cirúrgica a partir das 4 fotos manuscritas de 15/10/2026.
"""

import json
import os
import shutil
import subprocess

# Dicionário completo das 56 correções transcritas das anotações de campo
CORRECOES = {
    "01": {"rua": "Rua Celso Carrilho Faria", "numero_imovel": "123", "quarteirao": "Q-17", "bairro": "Jardim Centenário", "morador": "Maria de Fátima"},
    "02": {"rua": "Rua Padre Angelo Peloso", "numero_imovel": "158", "quarteirao": "Q-16", "bairro": "Jardim Centenário", "morador": "Glória"},
    "03": {"rua": "Rua Carolina França", "numero_imovel": "30", "quarteirao": "Q-09", "bairro": "Jardim Centenário", "morador": "Samy Soares"},
    "04": {"rua": "Rua Alceu Mattos", "numero_imovel": "99", "quarteirao": "Q-11", "bairro": "Jardim Centenário", "morador": "PA"},
    "05": {"rua": "Rua Ernesto Wermelinger", "numero_imovel": "63", "quarteirao": "Q-17", "bairro": "Jardim Centenário", "morador": "Manoel Ezidio"},
    "06": {"rua": "Rua Raul Fernandes Mesquita Soares", "numero_imovel": "30", "quarteirao": "Q-29", "bairro": "Centro", "morador": "Cleyde"},
    "07": {"rua": "Rua Jair Nunes Macuco", "numero_imovel": "58", "quarteirao": "Q-09/1", "bairro": "Boa Ideia", "morador": "Lidiane"},
    "08": {"rua": "Rua Armando Chaves", "numero_imovel": "161", "quarteirao": "Q-09", "bairro": "Boa Ideia", "morador": "ESF Botafogo"},
    "09": {"rua": "Rua José Murad Ferreira", "numero_imovel": "124", "quarteirao": "Q-23", "bairro": "Centro", "morador": "Marli"},
    "10": {"rua": "Rua Oscar de Souza Curty", "numero_imovel": "42", "quarteirao": "Q-13", "bairro": "Centro", "morador": "Clea Suely"},
    "11": {"rua": "Rua José Pinto Pinheiro", "numero_imovel": "82", "quarteirao": "Q-01", "bairro": "Centro", "morador": "Asilo São Vicente"},
    "12": {"rua": "Ladeira João Alfredo", "numero_imovel": "70", "quarteirao": "Q-10", "bairro": "Centro", "morador": "José Carlos enfermeiro"},
    "13": {"rua": "Rua Ulisses Lengruber", "numero_imovel": "618", "quarteirao": "Q-16", "bairro": "Caixa d'Água", "morador": "Lucia Glória"},
    "14": {"rua": "Rua Isaura Maia", "numero_imovel": "34", "quarteirao": "Q-15", "bairro": "Boa Ideia", "morador": "Chico Cesario"},
    "15": {"rua": "Rua Jorge R. do Valle", "numero_imovel": "290", "quarteirao": "Q-15", "bairro": "Boa Ideia", "morador": "Maria das Dores Meneguiti"},
    "16": {"rua": "Rua Soares Brandão", "numero_imovel": "347", "quarteirao": "Q-10", "bairro": "Botafogo", "morador": "Selma Araújo"},
    "17": {"rua": "Rua Izaura Maia de Souza", "numero_imovel": "407", "quarteirao": "Q-04", "bairro": "Boa Ideia", "morador": "Gilmar Lutero"},
    "18": {"rua": "Rua Benjamim Avelino Lopes", "numero_imovel": "85", "quarteirao": "Q-01", "bairro": "Progresso", "morador": "Cirillo"},
    "19": {"rua": "Avenida Tancredo Neves", "numero_imovel": "49", "quarteirao": "Q-06", "bairro": "Progresso", "morador": "Clube"},
    "20": {"rua": "Rua Silvio Geraldo França", "numero_imovel": "465", "quarteirao": "Q-09", "bairro": "Progresso", "morador": "Roseli Ribeiro"},
    "21": {"rua": "Rua Silvio Geraldo França", "numero_imovel": "753", "quarteirao": "Q-09", "bairro": "Progresso", "morador": "Paula Miranda"},
    "22": {"rua": "Rua Rui Mesquita Soares", "numero_imovel": "726", "quarteirao": "Q-06", "bairro": "Caixa d'Água", "morador": "Fátima Regina"},
    "23": {"rua": "Rua Manoel José de Moraes", "numero_imovel": "51", "quarteirao": "Q-01", "bairro": "Progresso", "morador": "Pousada Valle do sol"},
    "24": {"rua": "Rua José Cassane", "numero_imovel": "04", "quarteirao": "Q-01", "bairro": "Progresso", "morador": "Marienio Oliveira"},
    "25": {"rua": "RJ-148", "numero_imovel": "S/N", "quarteirao": "Q-12", "bairro": "Progresso", "morador": "Edson Levindo"},
    "26": {"rua": "Rua Adalberto Pires da Silva", "numero_imovel": "396", "quarteirao": "Q-01", "bairro": "Morro do Estado", "morador": "Maxwell Neves"},
    "27": {"rua": "Rua Maria Enelina Cunha Rabello", "numero_imovel": "40", "quarteirao": "Q-02", "bairro": "Caixa d'Água", "morador": "Pretinho"},
    "28": {"rua": "Rua Adalberto Pires da Silva", "numero_imovel": "235", "quarteirao": "Q-05", "bairro": "Morro do Estado", "morador": "Vicente"},
    "29": {"rua": "Rua Manoel Gomes de Araújo", "numero_imovel": "S/N", "quarteirao": "Q-02", "bairro": "Val Paraíso", "morador": "ESF Val paraíso"},
    "30": {"rua": "Avenida Edgar Gismonti", "numero_imovel": "797", "quarteirao": "Q-02", "bairro": "Morro do Estado", "morador": "Janine"},
    "31": {"rua": "Rua Roberto Simões de Araújo", "numero_imovel": "98", "quarteirao": "Q-05", "bairro": "Val Paraíso", "morador": "Rosimeri"},
    "32": {"rua": "Rua Manoel Gomes de Araújo", "numero_imovel": "365", "quarteirao": "Q-05", "bairro": "Val Paraíso", "morador": "Regina Azevedo"},
    "33": {"rua": "Rua Emanuel de Moraes", "numero_imovel": "10", "quarteirao": "Q-05", "bairro": "Val Paraíso", "morador": "Fernando Sassa"},
    "34": {"rua": "Avenida Edgar Gismonti", "numero_imovel": "98", "quarteirao": "Q-05", "bairro": "Val Paraíso", "morador": "Delvania"},
    "35": {"rua": "Rua Senador Dantas", "numero_imovel": "200", "quarteirao": "Q-13", "bairro": "Caixa d'Água", "morador": "Almir Lemgruber"},
    "36": {"rua": "Rua Manoel Cirilo da Silva", "numero_imovel": "116", "quarteirao": "Q-05", "bairro": "Influência", "microarea": "Influência", "morador": "Silvana de Oliveira"},
    "37": {"rua": "Rua Hermogênio Chaves", "numero_imovel": "160", "quarteirao": "Q-03/1", "bairro": "Influência", "microarea": "Influência", "morador": "Aline Reiff"},
    "38": {"rua": "BR-116", "numero_imovel": "S/N", "quarteirao": "Q-06", "bairro": "Influência", "microarea": "Influência", "morador": "Independente"},
    "39": {"rua": "Rua Hernane F. Barbosa", "numero_imovel": "375", "quarteirao": "Q-01", "bairro": "Ilha dos Pombos", "microarea": "Light", "morador": "Jorge Alfredo de Onofre"},
    "40": {"rua": "Rua Antônio Carlos P. Cabral", "numero_imovel": "34", "quarteirao": "Q-03", "bairro": "Ilha dos Pombos", "microarea": "Light", "morador": "Meira Lúcia Ferreira Pinheiro"},
    "41": {"rua": "Rua Beira Rio", "numero_imovel": "130", "quarteirao": "Q-01", "bairro": "Ilha dos Pombos", "microarea": "Light", "morador": "Dayse Regina Lopes"},
    "42": {"rua": "Rua Gandur R. da Silva", "numero_imovel": "39", "quarteirao": "Q-01", "bairro": "Porto Velho do Cunha", "morador": "Maria das Graças Corrêa Cunha"},
    "43": {"rua": "Rua José Lino da Silveira", "numero_imovel": "144", "quarteirao": "Q-01", "bairro": "Porto Velho do Cunha", "morador": "Carmem Cunha"},
    "44": {"rua": "Rua Major Fajardo", "numero_imovel": "312", "quarteirao": "Q-10", "bairro": "Porto Velho do Cunha", "morador": "ESF Porto Velho"},
    "45": {"rua": "Rua Major Fajardo", "numero_imovel": "601", "quarteirao": "Q-01", "bairro": "Porto Velho do Cunha", "morador": "Lindomar Noronha"},
    "46": {"rua": "Rua Oscar Feuchard de Carvalho", "numero_imovel": "145", "quarteirao": "Q-10", "bairro": "Porto Velho do Cunha", "morador": "Olívia"},
    "47": {"rua": "Chácara São José", "numero_imovel": "S/N", "quarteirao": "Q-01", "bairro": "Córrego da Prata", "morador": "Joselia Correa de Carvalho"},
    "48": {"rua": "Rua Benfica", "numero_imovel": "48", "quarteirao": "Q-01", "bairro": "Córrego da Prata", "morador": "ESF Córrego da Prata"},
    "49": {"rua": "Rua Alfredo Ferreira", "numero_imovel": "S/N", "quarteirao": "Q-01", "bairro": "Córrego da Prata", "morador": "Rosilene Souza Ferreira"},
    "50": {"rua": "Rua José Ferreira Alves", "numero_imovel": "S/N", "quarteirao": "Q-06", "bairro": "Influência", "morador": "Franciane Miguel"},
    "51": {"rua": "Rua Maria da Silva Machareth", "numero_imovel": "182", "quarteirao": "Q-11", "bairro": "Influência", "morador": "Léo Jorge"},
    "52": {"rua": "Rua Antônio N. Leite", "numero_imovel": "100", "quarteirao": "Q-06", "bairro": "Influência", "morador": "ESF Influência"},
    "53": {"rua": "Rua José R. de Souza", "numero_imovel": "390", "quarteirao": "Q-01", "bairro": "Ilha dos Pombos", "microarea": "Light", "morador": "Colégio Light"},
    "54": {"rua": "Rua Sebastião F. da Costa", "numero_imovel": "389", "quarteirao": "Q-01", "bairro": "Barra de São Francisco", "morador": "Sebastião Ferreira"},
    "55": {"rua": "Rua Antônio R. Serafim", "numero_imovel": "S/N", "quarteirao": "Q-01", "bairro": "Barra de São Francisco", "morador": "Solange"},
    "56": {"rua": "Rua Sebastião F. da Costa", "numero_imovel": "10", "quarteirao": "Q-01", "bairro": "Barra de São Francisco", "morador": "Escola da Barra"}
}


def atualizar_arquivo_json(caminho):
    if not os.path.exists(caminho):
        print(f"[PULADO] Arquivo não encontrado: {caminho}")
        return []

    with open(caminho, 'r', encoding='utf-8') as f:
        traps = json.load(f)

    # Backup de segurança
    shutil.copyfile(caminho, caminho + '.bak')
    print(f"[BACKUP] Criado backup: {caminho}.bak")

    modificados = []

    for t in traps:
        num_str = f"{int(t.get('numero', 0)):02d}"
        if num_str in CORRECOES:
            corr = CORRECOES[num_str]
            antes = {
                'rua': t.get('rua'),
                'num': t.get('numero_imovel') or t.get('numeroImovel'),
                'q': t.get('quarteirao'),
                'b': t.get('bairro'),
                'morador': t.get('morador_nome') or t.get('moradorNome')
            }

            # Atualiza os campos mantendo snake_case e camelCase para compatibilidade total
            t['rua'] = corr['rua']
            t['numero_imovel'] = corr['numero_imovel']
            t['numeroImovel'] = corr['numero_imovel']
            t['quarteirao'] = corr['quarteirao']
            t['bairro'] = corr['bairro']
            t['microarea'] = corr.get('microarea', corr['bairro'])
            
            # Ajuste de morador com acentuação impecável
            t['morador_nome'] = corr['morador']
            t['moradorNome'] = corr['morador']

            modificados.append({
                'numero': num_str,
                'antes': antes,
                'depois': corr
            })

    # Salva com formatação limpa e UTF-8 estrito
    with open(caminho, 'w', encoding='utf-8') as f:
        json.dump(traps, f, indent=2, ensure_ascii=False)

    print(f"[SUCESSO] Atualizadas {len(modificados)} armadilhas em: {caminho}")
    return modificados


def main():
    arquivos = [
        "traps_clean_utf8.json",
        "src/lib/trapsOficiaisCarmo.json",
        r"C:\Users\Almir LK\Desktop\GPS OVITRAMPAS\traps_clean_utf8.json"
    ]

    historico_alteracoes = None
    for arq in arquivos:
        mods = atualizar_arquivo_json(arq)
        if mods and historico_alteracoes is None:
            historico_alteracoes = mods

    # Regenerar o PDF Oficial da tabela do Conta Ovos
    print("\n[PDF] Regenerando TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf...")
    res = subprocess.run(["python", "generate_pdf_tabela_conta_ovos.py"], capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print("[AVISO]", res.stderr)

    # Copiar o PDF atualizado para os locais acessíveis
    pdf_origem = "TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf"
    locais_pdf = [
        r"C:\Users\Almir LK\Desktop\TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf",
        r"C:\Users\Almir LK\Desktop\GPS OVITRAMPAS\TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf"
    ]
    for dest in locais_pdf:
        try:
            shutil.copyfile(pdf_origem, dest)
            print(f"[COPIA PDF] Atualizado com sucesso em: {dest}")
        except Exception as e:
            print(f"[ERRO COPIA] {dest}: {e}")

    # Gerar relatório resumido para auditoria
    with open("RELATORIO_AUDITORIA_ENDERECOS_CAMPO.md", "w", encoding="utf-8") as f:
        f.write("# Relatório de Auditoria: Atualização Cadastral das 56 Ovitrampas (Carmo-RJ)\n\n")
        f.write("**Data da Auditoria:** 15/10/2026\n")
        f.write("**Fonte:** Anotações e vistorias manuscritas de campo (4 fotos oficiais)\n\n")
        f.write("| OV | Morador Oficial | Logradouro e Nº Atualizado | Bairro / Distrito | Quarteirão | Coordenadas GPS (WGS84) |\n")
        f.write("|:---|:---|:---|:---|:---|:---|\n")

        with open("traps_clean_utf8.json", "r", encoding="utf-8") as fj:
            dados = json.load(fj)
            for d in dados:
                n = d['numero']
                m = d.get('morador_nome', '-')
                r = d.get('rua', '-')
                ni = d.get('numero_imovel', 'S/N')
                b = d.get('bairro', '-')
                q = d.get('quarteirao', '-')
                lat = d.get('latitude')
                lng = d.get('longitude')
                f.write(f"| OV-{n} | {m} | {r}, {ni} | {b} | {q} | `{lat:.7f}, {lng:.7f}` |\n")

    print("\n[CONCLUÍDO] Auditoria gerada em RELATORIO_AUDITORIA_ENDERECOS_CAMPO.md!")


if __name__ == "__main__":
    main()
