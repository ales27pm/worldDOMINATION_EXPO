import fitz, os
doc = fitz.open("attached_assets/691814004-Risk-II-Manual-Pc_1783787846795.pdf")
outdir = ".agents/outputs/pages"
os.makedirs(outdir, exist_ok=True)
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.8, 1.8))
    pix.save(f"{outdir}/page_{i+1:02d}.png")
print("done", doc.page_count)
