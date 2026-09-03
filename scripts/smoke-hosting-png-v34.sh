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
import struct
import sys

file_path,label=sys.argv[1],sys.argv[2]
expected=(int(sys.argv[3]),int(sys.argv[4]))
require_alpha=sys.argv[5]=='1'
data=open(file_path,'rb').read()
if data[:8] != b'\x89PNG\r\n\x1a\n':
    raise SystemExit(f'{label}: live file is not PNG')

pos=8
ihdr=None
chunk_types=[]
while pos+12 <= len(data):
    length=struct.unpack('>I',data[pos:pos+4])[0]
    chunk_type=data[pos+4:pos+8]
    chunk=data[pos+8:pos+8+length]
    end=pos+12+length
    if end > len(data):
        raise SystemExit(f'{label}: truncated PNG chunk')
    chunk_types.append(chunk_type)
    if chunk_type == b'IHDR':
        if length != 13:
            raise SystemExit(f'{label}: invalid IHDR length')
        ihdr=struct.unpack('>IIBBBBB',chunk)
    pos=end
    if chunk_type == b'IEND':
        break

if ihdr is None:
    raise SystemExit(f'{label}: PNG has no IHDR')
width,height,bit_depth,color_type,compression,filter_method,interlace=ihdr
if (width,height) != expected:
    raise SystemExit(f'{label}: expected {expected[0]}x{expected[1]}, got {width}x{height}')
if compression != 0 or filter_method != 0:
    raise SystemExit(f'{label}: unsupported PNG compression/filter metadata')

has_alpha = color_type in (4,6) or b'tRNS' in chunk_types
if require_alpha and not has_alpha:
    raise SystemExit(f'{label}: committed transparent-item master has no PNG alpha/transparency channel')
alpha_note=', alpha-capable' if has_alpha else ''
print(f'Verified exact {label} ({width}x{height}, {len(data)} bytes, bit-depth={bit_depth}, color-type={color_type}{alpha_note})')
PY
  rm -f "$tmp"
}

check_exact_file /online.html
check_exact_file /online/startup-gate-v33.js
check_exact_file /online/item-art-polish-v2.js
check_exact_file /online/game-loader.js
check_exact_file /online/jewel-art-inventory-v1.js
check_exact_file /online/collection-portrait-fit-v16.js
check_exact_file /online/enchant-card-art-v1.js
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
check_png /assets/items/enchant-card-lesser.png 64 114 0
check_png /assets/items/enchant-card-master.png 64 114 0
check_png /assets/items/pip-voucher-1000.png 1536 658 0
check_png /assets/items/pip-voucher-5000.png 1536 658 0
check_png /assets/items/pip-voucher-10000.png 1536 658 0
check_png /assets/items/pip-voucher-20000.png 1536 658 0
check_png /assets/items/pip-voucher-40000.png 1536 658 0
check_png /assets/items/pip-voucher-60000.png 1536 658 0
check_png /assets/items/pip-voucher-80000.png 1536 658 0
check_png /assets/items/pip-voucher-100000.png 1536 658 0

# Canonical jewel masters: all are high-resolution relative to their UI boxes and
# must be alpha-capable PNGs. This verifies the exact production bytes, not just
# that a URL returns something.
check_png /assets/items/jewel-ruby-power.png 128 128 1
check_png /assets/items/jewel-citrine-cooldown.png 128 128 1
check_png /assets/items/jewel-onyx-physical-defense.png 128 128 1
check_png /assets/items/jewel-amethyst-special-defense.png 128 128 1
check_png /assets/items/jewel-garnet-hp.png 128 128 1
check_png /assets/items/jewel-spinel-crit-chance.png 128 128 1
check_png /assets/items/jewel-bloodstone-crit-boost.png 128 128 1
check_png /assets/items/jewel-aquamarine-sp-gen.png 128 128 1
check_png /assets/items/jewel-peridot-experience.png 128 128 1
check_png /assets/items/jewel-moonstone-luck.png 128 128 1
check_png /assets/items/jewel-opal-insight.png 128 128 1
check_png /assets/items/jewel-tourmaline-potency.png 128 128 1
check_png /assets/items/jewel-element-fire.png 128 128 1
check_png /assets/items/jewel-element-ice.png 128 128 1
check_png /assets/items/jewel-element-wind.png 128 128 1
check_png /assets/items/jewel-element-lightning.png 128 128 1
check_png /assets/items/jewel-element-water.png 128 128 1
check_png /assets/items/jewel-element-earth.png 128 128 1
check_png /assets/items/jewel-element-metal.png 128 128 1
check_png /assets/items/jewel-element-nature.png 128 128 1
check_png /assets/items/jewel-element-poison.png 128 128 1
check_png /assets/items/jewel-element-holy.png 128 128 1
check_png /assets/items/jewel-element-shadow.png 128 128 1
check_png /assets/items/jewel-element-arcane.png 128 128 1

echo 'Production Hosting serves the committed game/runtime files and canonical PNG masters byte-for-byte; all 24 jewel masters are verified as transparent 128x128 PNGs.'
