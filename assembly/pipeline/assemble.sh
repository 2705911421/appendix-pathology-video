#!/bin/sh
# Assemble the v5 film: scene + bilingual subtitles + 12 s endcard + audio.
# See README.md for flags. Does not modify endcard/ or anything outside assembly/.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
exec node pipeline/assemble.mjs "$@"
