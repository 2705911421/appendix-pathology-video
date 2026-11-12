#!/bin/sh
# Strip container and encoder-identifying tags, then record ffprobe + on-screen string scan.
# Usage: blind_review.sh INPUT OUTPUT PROBE_TXT STRINGS_TXT [files to scan...]
set -eu
if [ "$#" -lt 4 ]; then
  echo "usage: blind_review.sh INPUT OUTPUT PROBE_TXT STRINGS_TXT [scan files...]" >&2
  exit 2
fi
IN=$1
OUT=$2
PROBE=$3
STRINGS=$4
shift 4

TMP=$(mktemp /tmp/blind_XXXXXX.mp4)
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

ffmpeg -y -hide_banner -loglevel error \
  -i "$IN" \
  -map 0:v:0 -map 0:a:0 \
  -map_metadata -1 \
  -fflags +bitexact \
  -flags:v +bitexact \
  -flags:a +bitexact \
  -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 16 -bf 0 -g 30 \
  -bsf:v 'filter_units=remove_types=6' \
  -c:a aac -b:a 160k -ar 48000 -ac 2 \
  -movflags +faststart \
  "$TMP"

python3 - "$TMP" << 'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
b = bytearray(p.read_bytes())
idx = 0
n = 0
while True:
    i = b.find(b'avc1', idx)
    if i < 0:
        break
    # Real VisualSampleEntry: six reserved zero bytes follow the box type.
    if i + 10 <= len(b) and b[i + 4:i + 10] == b'\x00' * 6:
        box = i - 4
        name = box + 50
        if name + 32 <= len(b):
            b[name:name + 32] = b'\x00' * 32
            n += 1
    idx = i + 4
if n < 1:
    raise SystemExit('no avc1 sample entry to clear')
p.write_bytes(b)
PY

mv "$TMP" "$OUT"
trap - EXIT

ffprobe -hide_banner -show_format -show_streams "$OUT" > "$PROBE.full"
grep -v '^DISPOSITION:' "$PROBE.full" > "$PROBE.body" || true
rm -f "$PROBE.full"

probe_rc=0
python3 - "$PROBE" "$PROBE.body" << 'PY' || probe_rc=$?
import sys
probe, body = sys.argv[1], sys.argv[2]
text = open(body, encoding='utf-8', errors='replace').read()
needles = ['encoder','lavf','lavc','libx264','libfdk','handbrake','author','artist','title','comment','description','copyright','三峡','Sharpton','Gisele','导师','指导','x264']
hits = []
low = text.lower()
for n in needles:
    if n.lower() in low:
        for line in text.splitlines():
            if n.lower() in line.lower():
                hits.append(line)
                break
open(probe, 'w', encoding='utf-8').write(text)
with open(probe, 'a', encoding='utf-8') as f:
    if 'codec_name=' not in text:
        f.write('\nRESULT: FAIL\nmissing codec_name\n')
        raise SystemExit(1)
    if hits:
        f.write('\nRESULT: FAIL\n')
        for h in hits:
            f.write('HIT: ' + h + '\n')
        raise SystemExit(1)
    f.write('\nRESULT: PASS\n')
PY
rm -f "$PROBE.body"

string_rc=0
python3 - "$STRINGS" "$@" << 'PY' || string_rc=$?
import sys
out = sys.argv[1]
files = sys.argv[2:]
patterns = ['三峡', 'Sharpton', 'Gisele', '导师', '指导']
hits = []
for path in files:
    try:
        lines = open(path, encoding='utf-8', errors='replace').read().splitlines()
    except FileNotFoundError:
        hits.append(f'MISSING {path}')
        continue
    for i, line in enumerate(lines, 1):
        for p in patterns:
            if p in line:
                snippet = line.strip().replace('\t', ' ')
                if len(snippet) > 200:
                    snippet = snippet[:200] + '…'
                hits.append(f'{path}:{i}: {p}: {snippet}')
pending = ''
for path in files:
    if path.endswith('endcard.json'):
        raw = open(path, encoding='utf-8').read()
        pending = 'yes' if '【待填】' in raw else 'NO — file was changed'
        break
with open(out, 'w', encoding='utf-8') as f:
    f.write('patterns: ' + ', '.join(patterns) + '\n')
    f.write('files:\n')
    for path in files:
        f.write('  ' + path + '\n')
    f.write(f'待填 in endcard.json: {pending or "not checked"}\n')
    if hits:
        f.write(f'hits: {len(hits)}\n')
        for h in hits:
            f.write(h + '\n')
        f.write('RESULT: FAIL\n')
    else:
        f.write('hits: 0\n')
        f.write('RESULT: PASS\n')
if hits:
    raise SystemExit(1)
PY

if [ "$probe_rc" -ne 0 ] || [ "$string_rc" -ne 0 ]; then
  echo "blind review failed: probe=$probe_rc strings=$string_rc" >&2
  exit 1
fi
echo "blind review PASS"
