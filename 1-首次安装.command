#!/bin/bash
cd "$(dirname "$0")" || exit 1
finish() { echo; read -n1 -r -p "按任意键关闭…"; echo; }
if ! command -v node >/dev/null 2>&1; then
  echo '没有检测到 Node.js。请去 https://npmmirror.com/mirrors/node/ ，进入 latest-v20.x，下载 .pkg 安装包，双击安装后重新打开本文件。'
  finish; exit 1
fi
if ! node -e "process.exit(+process.versions.node.split('.')[0]>=18?0:1)"; then
  echo 'Node.js 版本太旧，请安装 18 或更新版本，推荐 v20，然后重新打开本文件。'
  finish; exit 1
fi
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export FFMPEG_BINARIES_URL=https://registry.npmmirror.com/-/binary/ffmpeg-static
export npm_config_registry=https://registry.npmmirror.com
if ! npm install --include=optional; then
  echo '网络不稳定，请检查网络后重试，或联系组长。'
  finish; exit 1
fi
if ! node tools/check.mjs --env; then
  echo '环境尚未就绪，请按上面的提示处理；不明白时请截图发给组长。'
  finish; exit 1
fi
echo '安装完成，请继续双击 2-出样张.command'
finish
