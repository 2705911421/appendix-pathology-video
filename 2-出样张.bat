@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
:choose
set "SCENE="
echo 请输入场景编号（S08 / S10 / S11 / S14 / S19），直接回车使用 S14（最新完成的场景）：
set /p SCENE=
if not defined SCENE set "SCENE=S14"
if /i "%SCENE%"=="S08" goto scene_S08
if /i "%SCENE%"=="S10" goto scene_S10
if /i "%SCENE%"=="S11" goto scene_S11
if /i "%SCENE%"=="S14" goto scene_S14
if /i "%SCENE%"=="S19" goto scene_S19
echo 场景编号不正确，请重新输入。
goto choose
:scene_S08
set "SCENE=S08"
goto render
:scene_S10
set "SCENE=S10"
goto render
:scene_S11
set "SCENE=S11"
goto render
:scene_S14
set "SCENE=S14"
goto render
:scene_S19
set "SCENE=S19"
goto render
:render
echo 首次渲染需要几分钟，请不要关闭窗口。
node tools/render-scene.mjs samples --scene %SCENE%
if errorlevel 1 goto failed
start "" explorer "out\samples\%SCENE%"
goto end
:failed
echo 出错了，请把窗口里的文字截图发给组长。请确认已经运行 1-首次安装.bat。
:end
pause
