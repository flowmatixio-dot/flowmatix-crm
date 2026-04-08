#!/bin/bash
# Build legal PDFs from HTML using headless Chrome.
# Output goes to ../public/legal/ AND ../../Website/legal/

set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
CRM_OUT="$SRC_DIR/../../public/legal"
WEB_OUT="$SRC_DIR/../../../Website/legal"

mkdir -p "$CRM_OUT" "$WEB_OUT"

# Map: html-source → output-pdf-name
declare -a DOCS=(
  "avv-de.html|AVV-Deutsch.pdf"
  "avv-en.html|AVV-Englisch.pdf"
  "avv-tr.html|DPA-Turkisch.pdf"
  "dpia-de.html|DPIA-Deutsch.pdf"
)

for entry in "${DOCS[@]}"; do
  src="${entry%%|*}"
  out="${entry##*|}"
  src_path="$SRC_DIR/$src"

  if [ ! -f "$src_path" ]; then
    echo "⚠ skip: $src not found"
    continue
  fi

  echo "→ generating $out from $src"
  "$CHROME" \
    --headless \
    --disable-gpu \
    --no-pdf-header-footer \
    --print-to-pdf="$CRM_OUT/$out" \
    "file://$src_path" 2>/dev/null

  # Copy to website too
  cp "$CRM_OUT/$out" "$WEB_OUT/$out"
  echo "✓ $out written to CRM/public/legal/ and Website/legal/"
done

echo ""
echo "═══ Done ═══"
ls -lh "$CRM_OUT"/*.pdf
