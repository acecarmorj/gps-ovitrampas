with open('scratch/contaovos_doc_parsed.md', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('curl -G -d')
print(text[idx:idx+400])
