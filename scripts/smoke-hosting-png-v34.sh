#!/usr/bin/env bash
set -euo pipefail
: "${LIVE_URL:?LIVE_URL is required}"
VERIFY_SHA="${DEPLOY_SHA:-${GITHUB_SHA:?GITHUB_SHA is required}}"

check_exact_file() {
  local path="$1" repo_path tmp bytes source_sha live_sha
  repo_path="${path#/}"
  [[ -f "$repo_path" ]] || { echo "Repository source missing for production check: $repo_path"; exit 1; }
  tmp="$(mktemp)"
  curl -fsS -H 'Cache-Control: no-cache, no-store' "$LIVE_URL$path?verify=$VERIFY_SHA" -o "$tmp"
  bytes="$(wc -c < "$tmp" | tr -d ' ')"
  if ! cmp -s "$repo_path" "$tmp"; then
    source_sha="$(sha256sum "$repo_path" | awk '{print $1}')"
    live_sha="$(sha256sum "$tmp" | awk '{print $1}')"
    rm -f "$tmp"
    echo "Production file $path differs from committed source: repo=$source_sha live=$live_sha"
    exit 1
  fi
  rm -f "$tmp"
  echo "Verified exact $path ($bytes bytes)"
}

check_png() {
  local path="$1" width="$2" height="$3" require_alpha="${4:-0}" repo_path tmp source_sha live_sha
  repo_path="${path#/}"
  [[ -f "$repo_path" ]] || { echo "Repository PNG source missing: $repo_path"; exit 1; }
  tmp="$(mktemp)"
  curl -fsS -H 'Cache-Control: no-cache, no-store' "$LIVE_URL$path?verify=$VERIFY_SHA" -o "$tmp"
  if ! cmp -s "$repo_path" "$tmp"; then
    source_sha="$(sha256sum "$repo_path" | awk '{print $1}')"
    live_sha="$(sha256sum "$tmp" | awk '{print $1}')"
    rm -f "$tmp"
    echo "Production PNG $path differs from committed master: repo=$source_sha live=$live_sha"
    exit 1
  fi
  python3 - "$tmp" "$path" "$width" "$height" "$require_alpha" <<'PY'
import sys
from PIL import Image
file_path,label=sys.argv[1],sys.argv[2]
expected=(int(sys.argv[3]),int(sys.argv[4]))
require_alpha=sys.argv[5]=='1'
data=open(file_path,'rb').read()
if data[:8] != b'\x89PNG\r\n\x1a\n':
    raise SystemExit(f'{label}: live file is not PNG')
with Image.open(file_path) as image:
    if image.size != expected:
        raise SystemExit(f'{label}: expected {expected[0]}x{expected[1]}, got {image.size[0]}x{image.size[1]}')
    if require_alpha:
        if image.mode != 'RGBA':
            image=image.convert('RGBA')
        alpha=image.getchannel('A')
        hist=alpha.histogram(); total=image.width*image.height
        transparent=hist[0]/total
        opaque=hist[255]/total
        corners=[alpha.getpixel((0,0)),alpha.getpixel((image.width-1,0)),alpha.getpixel((0,image.height-1)),alpha.getpixel((image.width-1,image.height-1))]
        if transparent < .08:
            raise SystemExit(f'{label}: item background is not materially transparent ({transparent:.1%} fully transparent)')
        if opaque < .02:
            raise SystemExit(f'{label}: item foreground was over-removed ({opaque:.1%} opaque)')
        if any(c != 0 for c in corners):
            raise SystemExit(f'{label}: item canvas corners are not transparent: {corners}')
        print(f'Verified exact {label} ({image.width}x{image.height}, {len(data)} bytes, transparent={transparent:.1%}, opaque={opaque:.1%})')
    else:
        print(f'Verified exact {label} ({image.width}x{image.height}, {len(data)} bytes)')
PY
  rm -f "$tmp"
}

check_exact_file /online.html
check_exact_file /online/startup-gate-v33.js
check_exact_file /online/item-art-polish-v2.js
check_exact_file /assets/game-assets.json
check_exact_file /assets/audio/announcer/MissionFail.mp3
check_exact_file /assets/audio/announcer/CombatStart.mp3

check_png /assets/ui/loading-endless-horde.png 1536 1152 0
check_png /assets/ui/loading-al-hata.png 1536 1157 0
check_png /assets/items/chest-frozen-island-normal.png 1536 1536 1
check_png /assets/items/chest-frozen-island-hard.png 1536 1536 1
check_png /assets/items/chest-frozen-island-hell.png 1536 1536 1
check_png /assets/items/key-normal.png 1024 1536 1
check_png /assets/items/key-hard.png 1024 1536 1
check_png /assets/items/key-hell.png 1024 1536 1
check_png /assets/items/mystery-chest.png 1536 1152 1
check_png /assets/items/epic-summon-ticket.png 1536 1024 1
check_png /assets/items/exp-tome.png 1536 1536 1
check_png /assets/items/ore-common.png 1536 1536 1
check_png /assets/items/ore-rare.png 1536 1536 1
check_png /assets/items/ore-unique.png 1536 1536 1
check_png /assets/items/ore-legendary.png 1536 1536 1
check_png /assets/items/ore-omni.png 1536 1536 1
check_png /assets/items/gift-box-pink.png 1536 1536 1
check_png /assets/items/gift-box-icy.png 1536 1499 1

echo 'Production Hosting serves the committed game/audio files and all 18 canonical PNG masters byte-for-byte; PNG dimensions and transparent item backing are verified.'
