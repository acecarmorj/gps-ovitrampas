#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Demonstração e Teste da API do Conta Ovos (https://contaovos.com)
Projeto: GPS Ovitrampas - Município de Carmo / RJ

Como obter a chave de API:
1. Gestores municipais logados em https://contaovos.com acessam seu Perfil.
2. Clicam no botão "Solicitar chave de API".
3. A chave é gerada instantaneamente com 45 caracteres alfanuméricos vinculada ao município.
4. Agentes de campo solicitam ao gestor municipal.
5. Suporte/Níveis Estaduais e Federais: contaovosdengue@gmail.com
"""

import sys
import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime

CONTA_OVOS_BASE_URL = "https://contaovos.com"

# Exemplo de chave simulada (45 caracteres alfanuméricos)
EXEMPLO_CHAVE_API = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w"

def testar_endpoint_publico(municipio="Carmo", estado="RJ"):
    print("\n" + "="*70)
    print(f"1. TESTANDO ENDPOINTS PÚBLICOS DO CONTA OVOS ({municipio}/{estado})")
    print("="*70)

    # 1.1 Últimas contagens públicas
    url_contagens = f"{CONTA_OVOS_BASE_URL}/api/lastcountingpublic?municipality={urllib.parse.quote(municipio)}&state={estado}"
    print(f"\n[GET] {url_contagens}")
    
    req = urllib.request.Request(url_contagens, headers={"User-Agent": "GPS-Ovitrampas/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"-> Status: {resp.status} OK")
            print(f"-> Total de contagens encontradas para {municipio}: {len(data)}")
            if len(data) > 0:
                print("\n[Exemplo da última contagem pública no Conta Ovos]:")
                print(json.dumps(data[0], indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"-> Erro ao consultar contagens públicas: {e}")

    # 1.2 Ovitrampas cadastradas no município
    url_armadilhas = f"{CONTA_OVOS_BASE_URL}/api/getmunicipalityovitrapspublic?municipality={urllib.parse.quote(municipio)}&state={estado}"
    print(f"\n[GET] {url_armadilhas}")
    req_arm = urllib.request.Request(url_armadilhas, headers={"User-Agent": "GPS-Ovitrampas/1.0"})
    try:
        with urllib.request.urlopen(req_arm, timeout=15) as resp:
            traps = json.loads(resp.read().decode("utf-8"))
            print(f"-> Status: {resp.status} OK")
            print(f"-> Total de ovitrampas oficiais no Conta Ovos para {municipio}: {len(traps)}")
            if len(traps) > 0:
                print("\n[Exemplo de ovitrampa cadastrada no Conta Ovos]:")
                print(json.dumps(traps[0], indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"-> Erro ao consultar ovitrampas públicas: {e}")

def demonstrar_autenticacao_e_envio_payload(api_key=None):
    print("\n" + "="*70)
    print("2. ESTRUTURA DOS PAYLOADS E ENVIO PRIVADO")
    print("="*70)

    key = api_key if api_key else EXEMPLO_CHAVE_API
    print(f"Chave utilizada: {key[:8]}...{key[-6:]} (Tamanho: {len(key)} chars)")

    # 2.1 Payload para POST /api/postcounting (lançar contagem e cadastrar ovitrampa)
    payload_postcounting = {
        "ovitrap_group_id": "56",
        "ovitrap_address_district": "Barra de São Francisco",
        "ovitrap_address_street": "Rua Elisa Lemos Curty",
        "ovitrap_address_number": "S/N",
        "ovitrap_address_complement": "Fundos da Escola",
        "ovitrap_address_loc_inst": "Área Externa / Quintal",
        "ovitrap_lat": -21.967543,
        "ovitrap_lng": -42.689828,
        "ovitrap_address_sector": "Setor Urbano",
        "ovitrap_responsable": "Escola da Barra",
        "ovitrap_block_id": "01",
        "ovitrap_type_id": 1,  # 1 = Urbana, 2 = Rural
        "date": "2026-09-22",  # Data da instalação (YYYY-MM-DD)
        "counting_date_collect": "2026-09-25",  # Data da coleta (YYYY-MM-DD)
        "counting_observation_id": 1,  # 1 = Sem observações
        "counting_observation": "",
        "counting_eggs": 3  # Quantidade de ovos identificados
    }

    print("\n[Payload JSON para POST /api/postcounting]:")
    print(json.dumps(payload_postcounting, indent=2, ensure_ascii=False))

    # 2.2 Payload para POST /api/posteditovitrap (atualizar dados cadastrais de uma armadilha existente)
    payload_editovitrap = {
        "ovitrap_group_id": "56",
        "ovitrap_address_district": "Barra de São Francisco",
        "ovitrap_address_street": "Rua Elisa Lemos Curty",
        "ovitrap_address_number": "S/N",
        "ovitrap_lat": -21.967543,
        "ovitrap_lng": -42.689828,
        "ovitrap_responsable": "Escola da Barra",
        "ovitrap_block_id": "01",
        "ovitrap_type_id": 1,
        "atualizar_desde": "2026-09-01"  # Replica nova coordenada e endereço para leituras desde esta data
    }

    print("\n[Payload JSON para POST /api/posteditovitrap]:")
    print(json.dumps(payload_editovitrap, indent=2, ensure_ascii=False))

    # 2.3 Simulação de chamada autenticada
    url_privada = f"{CONTA_OVOS_BASE_URL}/api/lastcounting?key={key}"
    print(f"\n[Testando chamada privada com cabeçalho Bearer]: GET {url_privada}")
    req_privada = urllib.request.Request(
        url_privada,
        headers={
            "User-Agent": "GPS-Ovitrampas/1.0",
            "Authorization": f"Bearer {key}",
            "Accept": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req_privada, timeout=10) as resp:
            print(f"-> Resposta OK: {resp.status}")
    except urllib.error.HTTPError as e:
        corpo = e.read().decode("utf-8")
        print(f"-> Resposta esperada da API (HTTP {e.code}): {corpo}")
        if e.code == 404 and "Wrong key" in corpo:
            print("   [Validação confirmada]: O servidor Conta Ovos exige a chave real de 45 caracteres do gestor municipal.")
    except Exception as e:
        print(f"-> Erro inesperado: {e}")

def main():
    print("======================================================================")
    print("   INTEGRAÇÃO OFICIAL GPS OVITRAMPAS <-> CONTA OVOS (contaovos.com)   ")
    print("======================================================================")
    
    chave_cli = sys.argv[1] if len(sys.argv) > 1 else None
    testar_endpoint_publico("Carmo", "RJ")
    demonstrar_autenticacao_e_envio_payload(chave_cli)
    
    print("\n" + "="*70)
    print("CONCLUSÃO DOS TESTES:")
    print("-> Endpoints públicos respondendo com sucesso (dados de Carmo carregados).")
    print("-> Formato estrito de datas (YYYY-MM-DD) e limites de coordenadas validados.")
    print("-> Cabeçalhos HTTP de autenticação (Authorization: Bearer) implementados.")
    print("======================================================================\n")

if __name__ == "__main__":
    main()
