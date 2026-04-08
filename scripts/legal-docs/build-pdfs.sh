#!/bin/bash
# Build legal PDFs from HTML using headless Chrome.
# Output goes to ../public/legal/ AND ../../Website/legal/

set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
CRM_OUT="$SRC_DIR/../../public/legal"
DESKTOP_OUT="$HOME/Desktop/Flowmatix-Legal-PDFs"

mkdir -p "$CRM_OUT" "$DESKTOP_OUT"

# Map: html-source → output-pdf-name
declare -a DOCS=(
  "avv-de.html|AVV-Deutsch.pdf"
  "avv-en.html|AVV-Englisch.pdf"
  "avv-tr.html|DPA-Turkisch.pdf"
  "dpia-de.html|DPIA-Deutsch.pdf"
  "dpia-en.html|DPIA-English.pdf"
  "dpia-tr.html|DPIA-Turkisch.pdf"
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

  # Copy to user's Desktop folder so Bastian can upload them himself
  cp "$CRM_OUT/$out" "$DESKTOP_OUT/$out"
  echo "✓ $out written to CRM/public/legal/ and ~/Desktop/Flowmatix-Legal-PDFs/"
done

echo ""
echo "═══ Done ═══"
ls -lh "$CRM_OUT"/*.pdf
