import fitz
doc = fitz.open("attached_assets/691814004-Risk-II-Manual-Pc_1783787846795.pdf")
print("pages:", doc.page_count)
full_text = []
for i, page in enumerate(doc):
    t = page.get_text()
    full_text.append(f"--- PAGE {i+1} ---\n{t}")
out = "\n".join(full_text)
with open(".agents/outputs/risk2_manual_text.txt", "w") as f:
    f.write(out)
print("chars:", len(out))
print(out[:2000])
