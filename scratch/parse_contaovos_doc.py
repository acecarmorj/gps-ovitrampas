import re
from html import unescape

with open("scratch/contaovos_api_full.html", "r", encoding="utf-8") as f:
    html = f.read()

# Let's extract sections and clean text
# Remove scripts and styles
clean = re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL)
clean = re.sub(r'<style.*?</style>', '', clean, flags=re.DOTALL)

# Let's extract all api-cards or sections
cards = re.findall(r'<div class="api-card"[^>]*>(.*?)</div>\s*(?=<div class="api-card"|</section>|</div>)', clean, flags=re.DOTALL)
print(f"Found {len(cards)} api-cards")

# Let's also do a general text extraction of main
main_match = re.search(r'<main[^>]*class="api-main"[^>]*>(.*?)</main>', clean, flags=re.DOTALL)
if not main_match:
    main_match = re.search(r'<div[^>]*class="api-main"[^>]*>(.*?)</div>\s*</div>\s*</body>', clean, flags=re.DOTALL)

if main_match:
    main_content = main_match.group(1)
else:
    main_content = clean

# Convert HTML tags to readable text
def html_to_text(h):
    h = re.sub(r'<h[1-6][^>]*>(.*?)</h[1-6]>', r'\n\n### \1\n', h)
    h = re.sub(r'<p[^>]*>(.*?)</p>', r'\n\1\n', h)
    h = re.sub(r'<li[^>]*>(.*?)</li>', r'\n* \1', h)
    h = re.sub(r'<pre[^>]*><code[^>]*>(.*?)</code></pre>', r'\n```\n\1\n```\n', h, flags=re.DOTALL)
    h = re.sub(r'<tr[^>]*>', r'\n| ', h)
    h = re.sub(r'<td[^>]*>(.*?)</td>', r'\1 | ', h)
    h = re.sub(r'<th[^>]*>(.*?)</th>', r'**\1** | ', h)
    h = re.sub(r'<[^>]+>', ' ', h)
    h = unescape(h)
    lines = [line.strip() for line in h.splitlines() if line.strip()]
    return '\n'.join(lines)

parsed_text = html_to_text(main_content)
with open("scratch/contaovos_doc_parsed.md", "w", encoding="utf-8") as f:
    f.write(parsed_text)

print(f"Parsed doc written to scratch/contaovos_doc_parsed.md ({len(parsed_text)} chars)")
