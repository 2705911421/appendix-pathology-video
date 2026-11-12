from pathlib import Path
import json, subprocess
P=Path(__file__).resolve().parent
locked=['engine/lib/'+n+'.js' for n in ['he','he_detail','wash','ann','scope','camera']]+['parity_r4/chapters/04.js']
(P/'sha256_结束.txt').write_bytes(subprocess.check_output(['sha256sum',*locked]))
check=subprocess.check_output(['sha256sum','-c',str(P/'sha256_开工.txt')]).decode();(P/'sha256_校验.log').write_text(check)
assert (P/'sha256_开工.txt').read_bytes()==(P/'sha256_结束.txt').read_bytes()
k=json.loads((P/'keyframes.json').read_text());par=json.loads((P/'parity.json').read_text());v=json.loads((P/'video_check.json').read_text());det=(P/'determinism.log').read_text();assert 'frames match across render orders' in det
text='''# v6 f01 · S14 自检

基于 v6-fresh / 921f7cc（v6-s19-final），未执行 git commit。

## 逐句病理对应

- 句54：低倍为斜切、被圆形视野裁掉的椭圆阑尾壁；同一母图连续推进中倍。局部大片坏死区的肌束淡染、核消失，残存细胞轮廓呈鬼影，夹核碎屑。坏死区内红细胞散在并聚集成片。右侧尚存肌束仍保留梭形核；交界中性粒细胞和脓细胞形成炎症带。中倍标记坏死区、出血，句末退场。
- 句55：继续推进高倍，并沿交界向渗出区平移，视野中坏死、脓细胞和细丝状纤维素并存。分叶核中性粒细胞复用 detailedNeutrophil；脓细胞沿用 S10 的核固缩／碎裂和淡染胞质构造，纤维素沿用粉红曲线细丝。左栏变质、渗出两行并列，无箭头。
- 句56：连续拉回中倍，同时见坏死、出血及炎症边缘。黑色章节主题以墨色标题下划线呈现，深底上标题反白以保留可读性；前两行减淡。
- 句57：虚线框明确标示“可能”，镜头移至最外层；仅在坏死重处出现局灶全层缺损，外缘浆膜中断。少数脓细胞和小型深紫细菌颗粒团外溢，位置随固定种子／确定性公式排列，不作喷射。句末虹膜切出回纸色。

## 画面与时序

全部镜头时点通过 film/timeline.js 的 forScene(54,57,0) 与 T.at/end/frac 取得。范围与字幕主题按句 id 54–57 绑定。深色底 #111114，视野圆心 (1110,475)、半径425；低／中／高倍不带数字。细引线、浅紫注释无底框，内容均在 y<950。

入、出各一次名义 0.7 秒虹膜；按30fps边界向外取整。转场复用 assembly/pipeline/iris_plate.py，源场景、回归帧和 determinism 均由指定 render.mjs 生成。原有只读库未改。

## 检查结果

'''
for scene,rows in par.items():
 text+='- '+scene.upper()+'：'+', '.join('{}={:.12g}'.format(x['frame'],x['MAE']) for x in rows)+'。\n'
text+='- S11 的三张约0.0128差异与 e01/e02 历史记录逐项一致，不算本次失败；其余帧均为0。\n- Determinism：PASS，见 determinism.log（跨页面、逆序同一时刻像素一致）。\n- 七个锁定文件开工与收工 SHA-256 完全一致，逐项 OK，见 sha256_开工.txt、sha256_结束.txt、sha256_校验.log。\n'
text+='''
## 视频交付与验证

S14.mp4 为1080p、30fps、CRF16。本段带配音720p从最终粗剪按虹膜窗口截取，视频CRF16。粗剪_v8 两个分辨率仅重编码 S14 所在关键帧窗口，使用 libx264 CRF16，其余视频包与 v7 音轨直接保留。

'''
text+=json.dumps(v,ensure_ascii=False,indent=2)+'\n'
text+='''
关键帧五张：句54低倍、中倍交界，句55、56、57；另有切入／切出中间帧。七张均附同名 _200pct.png，review_sheet.png 汇总全部。

## 仍可改善

组织层带与局部肌束仍较规整，呈教学示意而非真实切片复杂纹理；坏死区保留的鬼影层带较明显。全层缺损为了说明通路而加宽，高倍只显示外壁局部；并非真实切片中所有穿孔形态的概括。高倍母图为栅格，200%局部可见像素插值。深色底上命名标题反白，墨黑主题仅由下划线表达。

## 复现

node qa/v6/f01_s14/render_all.mjs
python3 qa/v6/f01_s14/build_v8.py
python3 qa/v6/f01_s14/finish.py
python3 qa/v6/f01_s14/write_report.py
'''
(P/'自检.md').write_text(text)
