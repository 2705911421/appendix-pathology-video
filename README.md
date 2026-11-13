# 病理科普视频

## 给第一次用的同学

0. 你需要什么：一台 Windows 10/11 电脑（自带 Edge 浏览器），能上网。macOS 同学可以双击下面同名的 `.command` 文件。
1. 安装 Node.js（只做一次）：打开 https://npmmirror.com/mirrors/node/ ，进入 `latest-v20.x`（或 v20 最新版目录），Windows 下载以 `-x64.msi` 结尾的安装包，macOS 下载 `.pkg`。双击安装，一路点“下一步”。
2. 下载项目：先接受组长发给你的 GitHub 邀请邮件并登录 GitHub（项目是私有的），然后在项目页面点绿色 **Code → Download ZIP**，解压到一个全英文路径的文件夹，例如 `D:\pathology`。推荐不要放在桌面或带中文的路径；这些位置可以放，但遇到问题时先换成英文路径。如果会用 git，也可以用下面这一行（把地址换成当前 GitHub 页面的项目地址）：`git clone <项目地址>`。
3. 双击 `1-首次安装.bat`，等待“安装完成”。需要下载一些文件，请保持网络连接。
4. 双击 `2-出样张.bat`，输入场景编号后回车；直接回车就是 S14（最新完成的场景）。等几分钟，文件夹自动打开，里面的 PNG 就是样张。
5. 双击 `3-出预览视频.bat`，同样选择场景；完成后文件夹自动打开，MP4 可以直接播放。
6. 有配音文件时，在出预览视频的窗口询问配音时，把 `.wav` 文件拖进窗口，再按回车；没有就直接回车。请使用组长提供的完整配音，程序会截取当前场景对应的部分。
7. 看完样张，把想修改的地方写成文字发给组长，例如“ S14 第三张的字幕太小”。不需要提交代码。
8. 常见问题：窗口一闪而过或报错时，再次打开并把窗口文字截图发给组长；如果仍然一闪而过，请说明双击的是哪个文件。找不到 Edge/Chrome 时，安装 Microsoft Edge 或 Google Chrome 后重试。杀毒软件拦截时，先确认文件来自组长提供的项目，再联系组长核实并按提示处理。渲染慢是正常的：画面使用 CPU 软件渲染（SwiftShader），首次需要几分钟，请不要关闭窗口。macOS 若提示无法打开，请在确认来源后右键文件选择“打开”；仍有问题请截图发给组长。

以浏览器画布渲染病理科普场景，并生成样张、预览视频和字幕片尾合成。

## 环境要求

Windows、macOS 或 Linux；Node.js 18+、git。仅需在仓库根目录安装依赖，assembly 会向上解析根目录的 Playwright（固定为 1.55.0）。

视频编码默认使用 npm 的 ffmpeg-static，不需要单独安装 ffmpeg。解析顺序为 FFMPEG_PATH → ffmpeg-static → 系统 PATH。ffprobe 使用 FFPROBE_PATH → @ffprobe-installer/ffprobe → 系统 PATH；样张不使用 ffprobe，预览在缺少 ffprobe 时用 ffmpeg 解码校验帧数，整片合成仍需要 ffprobe。安装脚本设置 FFMPEG_BINARIES_URL=https://registry.npmmirror.com/-/binary/ffmpeg-static 下载二进制；此下载不经过 .npmrc。

## 安装

```sh
git clone <仓库地址>
cd <仓库目录>
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 FFMPEG_BINARIES_URL=https://registry.npmmirror.com/-/binary/ffmpeg-static npm install --include=optional
```

上述安装命令适用于 macOS/Linux；Windows 推荐直接使用首次安装文件。浏览器自动检测顺序：CHROME_PATH → Microsoft Edge → Google Chrome → Playwright 自带 Chromium；最后尝试系统浏览器 channel 作为兜底。只有没有 Edge/Chrome 或其他可用 Chromium 的 Linux 服务器才需要运行 `npx playwright install chromium`。Linux 如缺系统库，可能还需执行 `npx playwright install-deps chromium`。安装步骤需要网络；渲染使用仓库内的资源。不要在 assembly 单独安装依赖。

## 一键渲染

```sh
npm run samples -- --scene S08
npm run samples:all
npm run preview -- --scene S08
npm run preview -- --scene S08 --full
npm run samples -- --scene S08 --times 1.5,3.2
npm run samples -- --scene S08 --sentences 31,34
npm run preview -- --scene S10 --workers 3 --fps 30 --crf 18
npm run samples -- --help
npm run check
```

场景支持 S08、S10、S11、S14、S19，不分大小写，默认 S08。样张默认使用定稿时间；`--times` 是场景内秒数，`--sentences` 取旁白该句的中点，两者可同时指定。S11 与 S10 共用句 37 的起点。`--out` 可指定输出根目录，样张会再建场景子目录。

样张输出到 `out/samples/<场景>/`，采用定稿名称加 `_t秒.png`；自定义秒数使用场景名和序号。预览输出到 `out/preview/S08_720p.mp4`，默认静音；`--full` 输出 1920×1080，文件名后缀为 `_1080p.mp4`。首次水彩烘焙约需几十秒到几分钟，每个工作进程都会烘焙一次；低内存电脑可设 `--workers 1`。

带配音示例（PowerShell）：

```powershell
npm run preview -- --scene S08 --voice "D:\路径\旁白.wav"
# 或设置环境变量后运行预览
$env:VOICE_WAV="D:\路径\旁白.wav"
npm run preview -- --scene S08
```

配音应是与 data/narration/timeline.json 对齐的完整旁白；渲染器会从场景 origin 截取对应时长，编码为 AAC。未提供配音或文件不存在时会提示并输出静音预览。旁白时间轴替换后，应先运行 `node film/generate_timeline.mjs` 同步浏览器使用的快照。

## Windows 注意事项

请用 PowerShell，含空格的路径要加引号。无需运行 Git Bash 专用脚本。ffmpeg 会随首次安装文件自动安装。若 Playwright 浏览器启动失败，可指定本机 Chrome：

```powershell
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
$env:FFMPEG_PATH="C:\工具\ffmpeg\bin\ffmpeg.exe"
$env:FFPROBE_PATH="C:\工具\ffmpeg\bin\ffprobe.exe"
```

macOS/Linux 可用 `export CHROME_PATH="浏览器可执行文件路径"` 设置。默认先检测 CHROME_PATH，再检测系统 Edge、Chrome，最后检测已安装的 Playwright Chromium。资源服务对共享库、字体、vendor 做目录别名，因此不依赖 Windows 能否还原 git 符号链接。

## 目录结构

- `film/`：场景入口和时间轴。
- `engine/`：渲染库与共享库；锁定文件不可改。
- `assembly/`：字幕、片尾与整片合成。
- `data/narration/`：旁白文本、字幕和时间轴数据。
- `tools/`：跨平台浏览器、编码器和渲染入口。
- `qa/`：历史审查记录。
- `分镜/`：分镜文档。

## 字幕与整片合成

```sh
npm run assemble -- --scene-video "场景.mp4" --out-dir "out/assembly" --out-name "整片"
npm run assemble -- --scene-video "场景.mp4" --voice "完整旁白.wav" --out-dir "out/assembly"
```

完整参数见 [assembly/pipeline/README.md](assembly/pipeline/README.md)。配音可通过 `--voice` 或 VOICE_WAV 提供，没有配音文件时使用静音配音轨；如另传 `--music` 则仍保留音乐。旁白文本默认读取 data/narration/，可通过 NARRATION_DIR 覆盖。默认盲审使用跨平台 Node 入口 `assembly/pipeline/blind_review.mjs`，保留的 `.sh` 是可选 bash 工具。

## 协作规则

- 每个任务一个分支，命名为 `场景-姓名`，PR 到 `v6-fresh`。
- 不直接推 `v6-fresh` 或 `master`；禁止 `git push --force`。
- 不提交任何图片、视频、音频，不写入密钥。
- 科学内容有疑问先问组长。
- 不改 engine/lib/ 中 he.js、he_detail.js、wash.js、ann.js、scope.js、camera.js 等锁定文件；场景画面逻辑变更须遵守任务范围。

## 常见问题

- 浏览器启动失败：确认已安装 Edge/Chrome，或设置 CHROME_PATH；只有没有系统浏览器的 Linux 服务器才需安装 Playwright Chromium。
- 字体异常：确认 engine/fonts/ 的字体文件完整，等待页面 READY；服务会从该目录读取字体，无需安装为系统字体。
- 找不到 ffmpeg：重新运行首次安装文件；它会设置镜像并安装 ffmpeg-static。ffprobe 对预览可选，整片合成缺少时请重新安装或设置 FFPROBE_PATH。
- 截图与组长略有像素差异：不同 GPU、浏览器版本可能产生抗锯齿差异，不影响审查；需要严格复现时统一浏览器版本和运行环境。
