import markdown2

files = ['产品介绍.md', '使用说明.md']
html_parts = []

for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        md = fh.read()
    html_parts.append(markdown2.markdown(md, extras=['tables', 'fenced-code-blocks']))

combined_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.8; font-size: 14px; }}
  h1 {{ font-size: 22px; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-top: 50px; }}
  h2 {{ font-size: 18px; color: #4f46e5; margin-top: 32px; }}
  h3 {{ font-size: 15px; margin-top: 24px; }}
  table {{ border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }}
  th, td {{ border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }}
  th {{ background: #f8fafc; font-weight: 600; }}
  code {{ background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }}
  pre {{ background: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }}
  blockquote {{ border-left: 3px solid #4f46e5; margin: 16px 0; padding: 8px 16px; color: #64748b; background: #f8fafc; }}
  hr {{ border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }}
  .page-break {{ page-break-before: always; }}
</style>
</head><body>
{html_parts[0]}
<div class="page-break"></div>
{html_parts[1]}
</body></html>"""

with open('combined.html', 'w', encoding='utf-8') as f:
    f.write(combined_html)

print('combined.html generated')
