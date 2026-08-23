#!/usr/bin/env bash
set -euo pipefail

: "${DRIVE_TOKEN:?DRIVE_TOKEN is required to materialize designer art}"

LOCK_FILE=".github/highres-art-v33.lock"

# file_id|target_path|width|height
ASSETS=(
  "1V_SZXLev17lTS7DcvXCCMjumWQx6pMCw|assets/ui/loading-endless-horde.jpg|1536|1152"
  "1P7482tkco0yBclqm1jl6ht3c0Y9dnLO5|assets/ui/loading-al-hata.jpg|1536|1157"
  "1hQwPanvWvXFinygoRMusYFPeb90jrqUv|assets/items/key-normal.jpg|1024|1536"
  "1nPUS74BCbmmJm4Mb4r1xiy_EhmLhV2zM|assets/items/key-hard.jpg|1024|1536"
  "1BzZjGF5CIfe5c9amC6kahW0KDL92g7VL|assets/items/key-hell.jpg|1024|1536"
  "1FT3xAhANJLBXh4sKmvuGwKL1fp9HH52v|assets/items/chest-frozen-island-normal.jpg|1536|1536"
  "1F_ojayqKl8vo2KJfvtnmn_kumT0Qibnc|assets/items/chest-frozen-island-hard.jpg|1536|1536"
  "1-8VgK8WoiblwQxRu1vKNczrAkHS_R7ED|assets/items/chest-frozen-island-hell.jpg|1536|1536"
  "1JBl_6ho6rOekJVrl6IRuDHCaK9MVfhZ5|assets/items/mystery-chest.jpg|1536|1152"
  "13nMNVO33EmQF6HOOUmqQn3ub6Z6-sdcj|assets/items/epic-summon-ticket.jpg|1536|1024"
  "1nY7SFKQh__l0mpJBcEitcDT9u1qsvihT|assets/items/exp-tome.jpg|1536|1536"
  "1E83GxTDeqRDjz9HfLZdzubxcOuoc4nJh|assets/items/ore-common.jpg|1536|1536"
  "1ytCdCFkgUzXd6qTHXWEXWEhlKpZ7smmP|assets/items/ore-rare.jpg|1536|1536"
  "1uhkJ9LyPLJaXjpzT2by_Qu-MzpwxJR27|assets/items/ore-unique.jpg|1536|1536"
  "1UjaP-OsJ8Se9sk36aH6xnGNSdzECL1Di|assets/items/ore-legendary.jpg|1536|1536"
  "1_0-94hYKRMq2XlTOS62X0V3MM3lrQoFh|assets/items/ore-omni.jpg|1536|1536"
  "1_e_GuEFg0gw7Utkgh7nWzP1G_9yCHvVD|assets/items/gift-box-pink.jpg|1536|1536"
  "1fhVM8m6Ws6qsVvbl7l3PvgdLZQ0s7Y76|assets/items/gift-box-icy.jpg|1536|1499"
)

verify_jpeg() {
  local path="$1" expected_w="$2" expected_h="$3"
  [[ -f "$path" ]] || return 1
  [[ $(wc -c < "$path") -gt 60000 ]] || return 1
  python3 - "$path" "$expected_w" "$expected_h" <<'PY'
import struct,sys
path=sys.argv[1]; ew=int(sys.argv[2]); eh=int(sys.argv[3])
data=open(path,'rb').read()
if len(data)<4 or data[:2] != b'\xff\xd8': raise SystemExit(1)
i=2; dims=None
sof={0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF}
while i+4 <= len(data):
    while i < len(data) and data[i] != 0xFF: i += 1
    while i < len(data) and data[i] == 0xFF: i += 1
    if i >= len(data): break
    marker=data[i]; i += 1
    if marker in (0xD8,0xD9): continue
    if i+2 > len(data): break
    seglen=struct.unpack('>H',data[i:i+2])[0]
    if seglen < 2 or i+seglen > len(data): break
    if marker in sof and seglen >= 7:
        h,w=struct.unpack('>HH',data[i+3:i+7]); dims=(w,h); break
    i += seglen
if dims != (ew,eh):
    print(f'{path}: expected {ew}x{eh}, got {dims}',file=sys.stderr)
    raise SystemExit(1)
PY
}

needs_download=0
for spec in "${ASSETS[@]}"; do
  IFS='|' read -r id target width height <<< "$spec"
  if ! verify_jpeg "$target" "$width" "$height"; then
    needs_download=1
    break
  fi
done

if [[ "$needs_download" -eq 0 ]]; then
  echo "High-resolution designer art is already materialized and verified."
  exit 0
fi

for spec in "${ASSETS[@]}"; do
  IFS='|' read -r id target width height <<< "$spec"
  mkdir -p "$(dirname "$target")"
  tmp="${target}.download"
  echo "Downloading $target"
  curl -fLsS --retry 4 --retry-delay 1 \
    -H "Authorization: Bearer ${DRIVE_TOKEN}" \
    "https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true" \
    -o "$tmp"
  verify_jpeg "$tmp" "$width" "$height"
  mv "$tmp" "$target"
done

mkdir -p .github
cat > "$LOCK_FILE" <<'LOCK'
TTD high-resolution designer art v33
Native pixel dimensions verified before commit.
Runtime presentation size is controlled by UI/CSS, never by destructive source downsampling.
LOCK

echo "Materialized and verified ${#ASSETS[@]} high-resolution designer assets."
