#!/usr/bin/env bash
set -euo pipefail

: "${DRIVE_TOKEN:?DRIVE_TOKEN is required to materialize designer art}"

LOCK_FILE=".github/highres-art-v34.lock"

# file_id|target_path|width|height
# These Drive objects are the approved designer rasters stored as real PNG files.
# Runtime CSS is responsible for presentation size; this import never resizes art.
ASSETS=(
  "1V_SZXLev17lTS7DcvXCCMjumWQx6pMCw|assets/ui/loading-endless-horde.png|1536|1152"
  "1P7482tkco0yBclqm1jl6ht3c0Y9dnLO5|assets/ui/loading-al-hata.png|1536|1157"
  "1hQwPanvWvXFinygoRMusYFPeb90jrqUv|assets/items/key-normal.png|1024|1536"
  "1nPUS74BCbmmJm4Mb4r1xiy_EhmLhV2zM|assets/items/key-hard.png|1024|1536"
  "1BzZjGF5CIfe5c9amC6kahW0KDL92g7VL|assets/items/key-hell.png|1024|1536"
  "1FT3xAhANJLBXh4sKmvuGwKL1fp9HH52v|assets/items/chest-frozen-island-normal.png|1536|1536"
  "1F_ojayqKl8vo2KJfvtnmn_kumT0Qibnc|assets/items/chest-frozen-island-hard.png|1536|1536"
  "1-8VgK8WoiblwQxRu1vKNczrAkHS_R7ED|assets/items/chest-frozen-island-hell.png|1536|1536"
  "1JBl_6ho6rOekJVrl6IRuDHCaK9MVfhZ5|assets/items/mystery-chest.png|1536|1152"
  "13nMNVO33EmQF6HOOUmqQn3ub6Z6-sdcj|assets/items/epic-summon-ticket.png|1536|1024"
  "1nY7SFKQh__l0mpJBcEitcDT9u1qsvihT|assets/items/exp-tome.png|1536|1536"
  "1E83GxTDeqRDjz9HfLZdzubxcOuoc4nJh|assets/items/ore-common.png|1536|1536"
  "1ytCdCFkgUzXd6qTHXWEXWEhlKpZ7smmP|assets/items/ore-rare.png|1536|1536"
  "1uhkJ9LyPLJaXjpzT2by_Qu-MzpwxJR27|assets/items/ore-unique.png|1536|1536"
  "1UjaP-OsJ8Se9sk36aH6xnGNSdzECL1Di|assets/items/ore-legendary.png|1536|1536"
  "1_0-94hYKRMq2XlTOS62X0V3MM3lrQoFh|assets/items/ore-omni.png|1536|1536"
  "1_e_GuEFg0gw7Utkgh7nWzP1G_9yCHvVD|assets/items/gift-box-pink.png|1536|1536"
  "1fhVM8m6Ws6qsVvbl7l3PvgdLZQ0s7Y76|assets/items/gift-box-icy.png|1536|1499"
)

verify_png() {
  local path="$1" expected_w="$2" expected_h="$3"
  [[ -f "$path" ]] || return 1
  [[ $(wc -c < "$path") -gt 200000 ]] || return 1
  python3 - "$path" "$expected_w" "$expected_h" <<'PY'
import struct,sys
path=sys.argv[1]; ew=int(sys.argv[2]); eh=int(sys.argv[3])
data=open(path,'rb').read(32)
if len(data) < 24 or data[:8] != b'\x89PNG\r\n\x1a\n':
    print(f'{path}: not a PNG', file=sys.stderr); raise SystemExit(1)
if data[12:16] != b'IHDR':
    print(f'{path}: missing IHDR', file=sys.stderr); raise SystemExit(1)
w,h=struct.unpack('>II',data[16:24])
if (w,h)!=(ew,eh):
    print(f'{path}: expected {ew}x{eh}, got {w}x{h}',file=sys.stderr); raise SystemExit(1)
PY
}

needs_download=0
for spec in "${ASSETS[@]}"; do
  IFS='|' read -r id target width height <<< "$spec"
  if ! verify_png "$target" "$width" "$height"; then
    needs_download=1
    break
  fi
done

if [[ "$needs_download" -eq 0 ]]; then
  echo "Lossless PNG designer art is already materialized and verified."
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
  verify_png "$tmp" "$width" "$height"
  mv "$tmp" "$target"
done

mkdir -p .github
cat > "$LOCK_FILE" <<'LOCK'
TTD high-resolution designer art v34
Approved masters are stored as lossless PNG files at their native pixel dimensions.
Runtime presentation size is controlled by UI/CSS, never by destructive source downsampling.
LOCK

echo "Materialized and verified ${#ASSETS[@]} lossless PNG designer assets."
