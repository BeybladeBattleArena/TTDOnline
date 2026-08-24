#!/usr/bin/env bash
set -euo pipefail
: "${LIVE_URL:?LIVE_URL is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"

check_file() {
  local path="$1" min_bytes="$2" tmp bytes
  tmp="$(mktemp)"
  curl -fsS -H 'Cache-Control: no-cache, no-store' "$LIVE_URL$path?verify=$GITHUB_SHA" -o "$tmp"
  bytes="$(wc -c < "$tmp" | tr -d ' ')"
  rm -f "$tmp"
  if [ "$bytes" -lt "$min_bytes" ]; then
    echo "Production file $path is unexpectedly small: $bytes bytes"
    exit 1
  fi
  echo "Verified $path ($bytes bytes)"
}

check_png() {
  local path="$1" width="$2" height="$3" tmp
  tmp="$(mktemp)"
  curl -fsS -H 'Cache-Control: no-cache, no-store' "$LIVE_URL$path?verify=$GITHUB_SHA" -o "$tmp"
  python3 - "$tmp" "$path" "$width" "$height" <<'PY'
import struct,sys
file_path,label=sys.argv[1],sys.argv[2]
expected=(int(sys.argv[3]),int(sys.argv[4]))
data=open(file_path,'rb').read()
if len(data)<200000:
    raise SystemExit(f'{label}: unexpectedly small ({len(data)} bytes)')
if data[:8] != b'\x89PNG\r\n\x1a\n':
    raise SystemExit(f'{label}: live file is not PNG')
if data[12:16] != b'IHDR':
    raise SystemExit(f'{label}: PNG IHDR missing')
dims=struct.unpack('>II',data[16:24])
if dims != expected:
    raise SystemExit(f'{label}: expected {expected[0]}x{expected[1]}, got {dims[0]}x{dims[1]}')
print(f'Verified {label} ({dims[0]}x{dims[1]}, {len(data)} bytes)')
PY
  rm -f "$tmp"
}

check_file /online.html 1000
check_file /online/startup-gate-v33.js 1000
check_file /online/item-art-polish-v2.js 1000
check_file /assets/game-assets.json 1000

check_png /assets/ui/loading-endless-horde.png 1536 1152
check_png /assets/ui/loading-al-hata.png 1536 1157
check_png /assets/items/chest-frozen-island-normal.png 1536 1536
check_png /assets/items/chest-frozen-island-hard.png 1536 1536
check_png /assets/items/chest-frozen-island-hell.png 1536 1536
check_png /assets/items/key-normal.png 1024 1536
check_png /assets/items/key-hard.png 1024 1536
check_png /assets/items/key-hell.png 1024 1536
check_png /assets/items/mystery-chest.png 1536 1152
check_png /assets/items/epic-summon-ticket.png 1536 1024
check_png /assets/items/exp-tome.png 1536 1536
check_png /assets/items/ore-common.png 1536 1536
check_png /assets/items/ore-rare.png 1536 1536
check_png /assets/items/ore-unique.png 1536 1536
check_png /assets/items/ore-legendary.png 1536 1536
check_png /assets/items/ore-omni.png 1536 1536
check_png /assets/items/gift-box-pink.png 1536 1536
check_png /assets/items/gift-box-icy.png 1536 1499

echo 'Production Hosting serves all 18 canonical lossless PNG masters at their native dimensions.'
