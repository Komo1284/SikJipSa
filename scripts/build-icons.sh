#!/usr/bin/env bash
# Convert assets/*.svg → assets/*.png at the sizes Expo / EAS expect.
#
# Tries rsvg-convert first (best quality, multi-platform). Falls back to
# macOS's built-in qlmanage (which renders SVGs as square thumbnails only,
# so all our SVGs are authored at square viewBoxes).
#
# Outputs:
#   assets/icon.png            1024×1024  (iOS + generic)
#   assets/adaptive-icon.png   1024×1024  (Android adaptive icon foreground)
#   assets/splash.png          2048×2048  (square — Expo resizeMode "contain"
#                                          + matching backgroundColor handles
#                                          portrait/landscape letterboxing)

set -euo pipefail

cd "$(dirname "$0")/.."

render_square() {
  local svg=$1
  local png=$2
  local size=$3

  if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w "$size" -h "$size" "$svg" -o "$png"
  elif command -v qlmanage >/dev/null 2>&1; then
    local tmpdir
    tmpdir=$(mktemp -d)
    qlmanage -t -s "$size" -o "$tmpdir" "$svg" >/dev/null 2>&1
    mv "$tmpdir/$(basename "$svg").png" "$png"
    rm -rf "$tmpdir"
  else
    echo "❌  No SVG converter found."
    echo "    Install librsvg:  brew install librsvg"
    exit 1
  fi
}

echo "→ icon.png (1024×1024)"
render_square assets/icon.svg          assets/icon.png          1024

echo "→ icon-dark.png (1024×1024)"
render_square assets/icon-dark.svg     assets/icon-dark.png     1024

echo "→ adaptive-icon.png (1024×1024)"
render_square assets/adaptive-icon.svg assets/adaptive-icon.png 1024

echo "→ splash.png (2048×2048)"
render_square assets/splash.svg        assets/splash.png        2048

echo "→ splash-dark.png (2048×2048)"
render_square assets/splash-dark.svg   assets/splash-dark.png   2048

echo
echo "✅  done. Generated:"
ls -lh assets/*.png
