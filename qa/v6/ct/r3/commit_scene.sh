#!/bin/bash
set -euo pipefail
scene="$1"
git_ct=(git --git-dir=/tmp/ct-fix01-r3.git --work-tree=/workspace/病理科普视频/v5_ct_dev)
python3 qa/v6/ct/r3/finish_scene.py "$scene"
if [ "$scene" = S09 ]; then
  "${git_ct[@]}" add film/chapters/s09.js film/lib_ext/ct_r3_schematic.js film/lib_ext/ct_r3_compare.js qa/v6/ct/deliver.mjs qa/v6/ct/review.py qa/v6/ct/before_after.py qa/v6/ct/r3/审核意见.md qa/v6/ct/r3/sha256_start.log qa/v6/ct/r3/finish_scene.py qa/v6/ct/r3/commit_scene.sh qa/v6/ct/r3/git_fallback.log
elif [ "$scene" = S04 ]; then
  "${git_ct[@]}" add film/chapters/s04.js film/lib_ext/ct_r3_doctor.js film/lib_ext/ct_r3_clinical.js
else
  "${git_ct[@]}" add "film/chapters/${scene,,}.js"
fi
"${git_ct[@]}" add "qa/v6/ct/$scene" "qa/v6/ct/${scene}_build_r3.log"
"${git_ct[@]}" -c user.name=mini -c user.email=mini@local commit -m "ct r3: $scene 审核修订与逐句交付（Codex）"
"${git_ct[@]}" log -1 --format='%h %s' >> qa/v6/ct/r3/commits.log
"${git_ct[@]}" bundle create qa/v6/ct/ct-dev.bundle refs/heads/ct-dev ^baf3b0f
"${git_ct[@]}" bundle verify qa/v6/ct/ct-dev.bundle > qa/v6/ct/r3/bundle_verify.log 2>&1
