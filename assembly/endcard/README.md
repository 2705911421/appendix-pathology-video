# 独立片尾组件（v5）
将整个 endcard 文件夹复制进新项目，保留相对目录结构。
页面、JSON、字体、墨线库均为本地文件，无旧版影片依赖。
使用 HTTP 静态服务器打开 index.html，画布为 1920×1080。
页面等待 MixSans Regular / Bold 加载完成后设置 window.READY = true。
页面提供 window.DUR = 12 与 window.render(t)，t 为片尾本地秒数。
模块导出 bakeEndCard(bake)，当前无需预烘焙。
模块导出 drawEndCard(ctx, t, { start = 0, duration = 12 } = {})。
模块也导出 endcardData；文字、预分行、配色和版式位于 data/endcard.json。
宿主需先加载 vendor/rough.js、字体，并填充纸色背景。
安装渲染依赖：npm install playwright && npx playwright install chromium。
生成样帧：node render.mjs；也可通过 CHROME_PATH 指定 Chromium。
输出 样帧_片尾.png，为 t=3 与 t=9 的 1920×2160 竖向合成图。
渲染器检查文字边界、引文分行还原及重复渲染一致性。
可选备用：若本机没有 Chromium，可用 python3 static-preview.py 生成排版校对图（不会写入 ink/Rough 成片样帧）。
