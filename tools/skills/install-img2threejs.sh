#!/usr/bin/env bash
# img2threejs skill-a instalatu (argazki batetik three.js eredu prozedurala sortzeko).
# https://github.com/hoainho/img2threejs — Apache-2.0. Python 3.10+ behar du.
set -euo pipefail
DEST="${1:-$HOME/.claude/skills/img2threejs}"
if [ -d "$DEST/.git" ]; then
  git -C "$DEST" pull --ff-only
else
  git clone --depth 1 https://github.com/hoainho/img2threejs.git "$DEST"
fi
echo "img2threejs instalatuta: $DEST  (Claude Code-n: /img2threejs + irudia)"
