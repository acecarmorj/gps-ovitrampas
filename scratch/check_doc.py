import re

doc_path = r"C:\Users\Almir LK\.gemini\antigravity\brain\d51689eb-8291-425d-ac0f-e0ac0bb25191\.system_generated\steps\13\content.md"

with open(doc_path, "r", encoding="utf-8") as f:
    text = f.read()

print(f"Total characters: {len(text)}")

# Find all occurrences of api
for m in re.finditer(r"(api[^\s\"'<>]{0,40})", text, re.I):
    start = max(0, m.start() - 30)
    end = min(len(text), m.end() + 30)
    print(f"[{m.group(0)}] => ...{text[start:end]}...")
