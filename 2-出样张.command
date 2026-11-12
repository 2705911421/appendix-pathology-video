#!/bin/bash
cd "$(dirname "$0")" || exit 1
finish() { echo; read -n1 -r -p "按任意键关闭…"; echo; }
while true; do
  read -r -p '请输入场景编号（S08 / S10 / S11 / S14 / S19），直接回车使用 S14（最新完成的场景）：' SCENE
  SCENE=$(printf '%s' "${SCENE:-S14}" | tr '[:lower:]' '[:upper:]')
  case "$SCENE" in S08|S10|S11|S14|S19) break;; *) echo '场景编号不正确，请重新输入。';; esac
done
VOICE_ARGS=()
echo "首次渲染需要几分钟，请不要关闭窗口。"
if node tools/render-scene.mjs samples --scene "$SCENE" "${VOICE_ARGS[@]}"; then
  open "out/samples/$SCENE"
else
  echo "出错了，请把窗口里的文字截图发给组长。请确认已经运行首次安装文件。"
fi
finish
