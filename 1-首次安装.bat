@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto no_node
node -e "process.exit(+process.versions.node.split('.')[0]>=18?0:1)"
if errorlevel 1 goto old_node
set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
set FFMPEG_BINARIES_URL=https://registry.npmmirror.com/-/binary/ffmpeg-static
set npm_config_registry=https://registry.npmmirror.com
call npm install --include=optional
if errorlevel 1 goto network_error
node tools/check.mjs --env
if errorlevel 1 goto check_error
echo 安装完成，请继续双击 2-出样张.bat
goto end
:no_node
echo 没有检测到 Node.js。请先打开 https://npmmirror.com/mirrors/node/ ，进入 latest-v20.x（或 v20 最新版目录），下载以 -x64.msi 结尾的安装包，双击安装（一路点“下一步”），装完后关闭本窗口，重新双击本文件。
goto end
:old_node
echo Node.js 版本太旧，请到 https://npmmirror.com/mirrors/node/ 安装 18 或更新版本，推荐 v20。安装后重新打开本文件。
goto end
:network_error
echo 网络不稳定，请检查网络后重试，或联系组长。
goto end
:check_error
echo 环境尚未就绪，请按上面的提示处理；不明白时请截图发给组长。
:end
pause
