#!/usr/bin/env python3
"""
Bundler — assemble src/index.html + src/styles.css + src/js/0X-*.js
into a single self-contained index.html at the repo root, ready for
GitHub Pages.

Usage:
    python3 bundle.py

Workflow: edit files under src/ only, then re-run this script before
committing/pushing. The generated root index.html is the deployable
artifact and should NOT be edited by hand.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
TEMPLATE = os.path.join(SRC, 'index.html')
STYLES = os.path.join(SRC, 'styles.css')
JS_DIR = os.path.join(SRC, 'js')
OUTPUT = os.path.join(ROOT, 'index.html')


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def main():
    if not os.path.isfile(TEMPLATE):
        sys.exit(f"Introuvable : {TEMPLATE}")

    html = read(TEMPLATE)

    # 1) Inline styles.css: replace <link rel="stylesheet" href="styles.css">
    #    with <style>...</style>
    css_content = read(STYLES)
    link_pattern = re.compile(r'<link\s+rel="stylesheet"\s+href="styles\.css"\s*>')
    if not link_pattern.search(html):
        sys.exit("Balise <link rel=\"stylesheet\" href=\"styles.css\"> introuvable dans src/index.html")
    html = link_pattern.sub(lambda m: '<style>\n' + css_content + '\n</style>', html, count=1)

    # 2) Inline JS modules: replace the whole sequence of
    #    <script src="js/0X-*.js"></script> tags with a single
    #    <script>"use strict"; ...concatenated modules... </script>
    js_files = sorted(glob.glob(os.path.join(JS_DIR, '*.js')))
    if not js_files:
        sys.exit(f"Aucun module JS trouvé dans {JS_DIR}")

    parts = []
    for path in js_files:
        content = read(path)
        # Strip each module's own "use strict"; pragma (added for local dev
        # only) — the bundle re-adds a single one at the very top.
        content = re.sub(r'^\s*"use strict";\s*\n', '', content, count=1)
        parts.append(content.strip('\n'))
    bundled_js = '"use strict";\n\n' + '\n\n'.join(parts) + '\n'

    script_tag_pattern = re.compile(r'(?:<script src="js/\d+-[\w-]+\.js"></script>\s*)+')
    if not script_tag_pattern.search(html):
        sys.exit("Aucune séquence de <script src=\"js/0X-*.js\"> trouvée dans src/index.html")
    html = script_tag_pattern.sub(lambda m: '<script>\n' + bundled_js + '</script>', html, count=1)

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"Bundle généré : {OUTPUT} ({len(html)} caractères)")


if __name__ == '__main__':
    main()
