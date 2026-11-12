from pathlib import Path
import json,hashlib,subprocess
P=Path(__file__).resolve().parent
parity=json.loads((P/'parity.json').read_text());m=json.loads((P/'cell_measurements.json').read_text())
text='''# v6 f03 · S14 精度轮自检

基于 v6-fresh / 108b1d2，在现有 film/chapters/s14.js、film/lib_ext/he_gangrene.js 上修改，未执行 git commit。f02 低倍镜头坐标、缩放关键点、坏死角域及黏膜缺失范围保持不变；同一斜切母图贯穿句54–57。

## 逐项修改

1. 句55：取消单块实心核的简化脓细胞，统一三至四叶核。各叶有轮廓、淡紫填色和小染色质点，以细连接相连；胞质淡染且保留细边界。生成母图时按胞体半径排除相邻重叠，避免紫核粘成团。中性粒细胞、红细胞、鬼影、肌束和纤维素以固定母图坐标缓存，按当前圆形视野筛选后直接在输出画布上绘制矢量，不再从二倍栅格放大这些细节。保留底层染色和水洗的栅格母图。肌束降低长椭圆填色强度，增加三条细纤维线和尖端梭形核，色相及核比例参照 S19 已交付肌层；未改动 S19。
2. 句55/56/57：原先完整的鬼影细胞椭圆改成两段不闭合、带多频扰动的淡轮廓；长短轴、旋转、缺失弧段、大小和密度随固定随机种子变化，部分仅留极小核碎屑，不画完整核。位置随机且非网格。坏死肌层仍保留少量淡染长束痕迹，作为结构残影。
3. 句57：纤维素改为不同方向、不同长度和粗细的交错细丝，保留小分支与交叉；同时沿坏死床加入低对比多尺度染色微斑及细颗粒。缺口仍沿原先局灶全层糜烂通道，边缘有残片、碎核、红细胞，内部和壁外少量脓细胞及细菌团，不喷射。穿孔叠层也用相同鬼影、细胞和丝网画法。
4. 句57左栏：删除独立“可能”框，只保留虚线包围的一行“可能穿孔：感染扩散至腹腔”。
5. 句54中倍和句56同步使用同一套细节，无另起母图、无镜头跳切。句54低倍构图与坏死范围未动，但共享细胞细节的像素会随本轮修改而变化。

## 同倍率对照与测量

review_sheet.png 前七行三列为整帧 / S14 原生300×300裁区的200% / 细化样张原生300×300裁区的200%；最近邻放大，无单独缩放来追平大小。样张使用 qa/ref/style_target/t_089.73.png 的 (480,340)-(780,640)。最后两行另对 S11 已定稿 s44、s45_pus 与 S14 s55 采用完全相同的屏幕裁区 (950,260)-(1250,560)，同为200%。S11仅作已定稿尺度基准，画风标准仍是细化样张。

测量为原生1920×1080像素的胞质外边界手工包围盒，约±2像素；每帧三例，框和编号见 *_measure_200pct.png，坐标及长短径见 cell_measurements.json。S11 s44 与 s45_pus 使用相同坐标的相同细胞，避免跨位置挑尺寸。

| 帧 | 三例宽×高（原生像素） | 中位宽×高 |
| --- | --- | --- |
'''
for name,v in m.items():
 text+=f"| {name} | "+'、'.join(f"{c['width']}×{c['height']}" for c in v['cells'])+f" | {v['median_width']}×{v['median_height']} |\n"
text+='''
S14句55测得的中位宽与S11差约1像素，处于该抽样的细胞尺度范围；这不是全场统计。高倍胞体名义长径由20.4×(0.73–0.80)×3.1得到46.2–50.6像素，旋转后包围盒随角度变化。细化样张的胞体多数比上述S11/S14屏幕尺度更小；本轮按用户指定优先与S11定稿高倍对齐尺度，没有声称和样张大小完全相等。

同倍率视觉复核：句55分叶核现可分别辨认，肌束可见细线及尖端核；句54低/中倍及句56因为镜头倍率较小，细胞也相应变小，未人为放大裁图。句57残缺鬼影和交错丝网比f02更不规则，背景仍淡染但有细微起伏。样张的胞质颗粒、组织天然染色层次仍更丰富。

## 硬约束与回归

圆心(1110,475)、半径425，深色底；镜头关键点仍用 T.at/end/frac 按句54–57取得；倍数仅低倍/中倍/高倍，画面无数字。全部图文在y<950，引线浅紫、细线无底框（“可能穿孔”虚线为分支提示）。dark字幕保留粗剪v9底栏。入/出各一次名义0.7秒虹膜；30fps外取整边界及时间见 iris/resolved.json，沿用f02机制。

'''
for scene,frames in parity.items():text+=f"- {scene.upper()}："+'；'.join(f"{x['frame']} MAE={x['MAE']:.12g}" for x in frames)+'。\n'
text+='''
S08/S10/S19 必须全部 MAE=0；S11三帧约0.0128与历史基线逐项相同，只记录不判失败。check_stills.py 内有断言。

Determinism：六帧以不同顺序重复绘制一致（1.89、6.358、8.592、12.544、15.981、17.151秒），见 render.log。细胞排布、轮廓与微纹理均固定种子，draw阶段不累积状态。几何源定义逐项对照HEAD一致，见geometry_checks.json。

七个锁定文件开工/收工SHA256相同，并等于f02收工记录，见sha256_开工.txt、sha256_结束.txt、sha256_校验.log。产物哈希见outputs.sha256。

## 视频、验证与局限

S14.mp4为1080p/30fps、CRF16。首轮视频在接近结束时遇到Playwright截图30秒超时，自动重试后516帧完整输出；见render.log。虹膜合成曾被SIGTERM终止，降低本目录合成脚本的FFmpeg线程数后重跑；共享合成器未修改。粗剪_v10.mp4及720p版以v9为底，只在S14及虹膜窗口更换画面，底栏dark字幕沿用；窗口外包复制，音轨原样复制。video_check.json校验窗口外抽样MAE=0、音轨hash相同及dark底栏；insert_check.json从最终粗剪抽回五个关键帧验证确已插入。压缩视频不声称像素完全一致。S14_带配音_720p.mp4从最终粗剪截出完整虹膜窗口。

仍不足：细胞虽分离且分叶清楚，叶核形状和胞质颗粒仍比细化样张简化；部分细胞链与肌束方向仍有程序绘图痕迹。坏死背景微斑较克制，不能视作真实切片染色的完整复刻；坏死长肌束残影仍略规整。S14高倍细胞按S11尺度核对，未同时匹配样张较小的细胞尺度。低倍坏死范围不变，局灶缺口只表达可能发生的分支。

复现：node qa/v6/f03_s14/render_all.mjs；python3 qa/v6/f03_s14/build_v10.py --plate-only；python3 qa/v6/f03_s14/finish.py；python3 qa/v6/f03_s14/check_insert.py；python3 qa/v6/f03_s14/measure_cells.py；python3 qa/v6/f03_s14/write_report.py。
'''
(P/'自检.md').write_text(text)
paths=[p for p in P.rglob('*') if p.is_file() and p.suffix in ['.png','.mp4','.json','.js','.mjs','.py','.md']]+[P.parent/'animatic'/('粗剪_v10'+s+'.mp4') for s in ['', '_720p']]
(P/'outputs.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(Path.cwd()) if p.is_relative_to(Path.cwd()) else p)+'\n' for p in sorted(paths)))
