#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec /workspace/venv_qa/bin/python "$HERE/make_audio_mix.py" "$@"
