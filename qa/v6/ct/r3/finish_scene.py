import json,sys,subprocess
from pathlib import Path
from PIL import Image,ImageChops
scene=sys.argv[1];p=Path('qa/v6/ct')/scene
m=json.loads((p/'keyframes.json').read_text());media=json.loads((p/'media_check.json').read_text())
keys=m['picks'];checks=[]
for k in keys:
 im=Image.open(p/(k['name']+'.png')).convert('RGB')
 bg=Image.new('RGB',(1920,130),'#F4EFE6')
 assert ImageChops.difference(im.crop((0,950,1920,1080)),bg).getbbox() is None,k['name']
 checks.append({'frame':k['name'],'below_y950':'paper only'})
(p/'safe_check_r3.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
log=Path(f'qa/v6/ct/{scene}_build_r3.log').read_text();assert 'deterministic:' in log
subprocess.run(['python3','qa/v6/ct/before_after.py',scene,keys[-1]['name']],check=True)
content={
'S09':'句35：两窗同步突出壁增厚与黏膜下水肿；句36：全图与放大窗出现轻度脂肪模糊及条索，组织窗扩到浆膜外脂肪。左栏完全采用分镜S09行。',
'S12':'句47：壁明显增厚强化，继而出现范围更大的周围脂肪条索；句48保持同一画面，CT壁内外与组织窗全层炎细胞浸润对应。左栏完全采用分镜S12行。',
'S15':'句58：全图及放大窗显示一段不强化壁，组织窗对应淡染坏死、无完整核的区域；句59才出现腔外气泡及有强化边缘的液性脓肿，并显示[3]。警惕用语来自分镜S15行，不作CT独立确诊。',
'S04':'句14医生评估；句15才出现超声/CT选择；句16研究卡2023、8项研究、1602人；句17敏感度95%、特异度94%与[1]；句18只显示发现病变；句19显示仍需结合临床、判断病情轻重与临床/影像/病理关系。2023、1602人来自分镜研究卡63行，8项研究按真实配音及本次要求。医生函数逐字复制clin来源person及依赖至ct_r3_doctor.js，保持眼镜、发型、脸、听诊器和大褂。'}[scene]
text=f'''# {scene} 自检（r3 / Codex）

- [x] 初审记录先于修改建立，见 ../r3/审核意见.md。
- [x] 分镜与配音逐句对应：{content}
- [x] 浅米色底，左字右图；主图从x=610至1870，占画宽约65.6%，双窗底边930，放大窗直径约380，正文及图形均y<950。safe_check_r3.json对所有交付关键帧逐像素检查950以下仅纸色。
- [x] 全图阑尾位置在患者右侧（图左）的小框内，细紫引线连到放大窗；三场表现有管壁厚度、强化、渗出范围和并发症差别。灰阶色素叠加和细颗粒在prepare里一次绘制。
- [x] 组织有黏膜管状隐窝、柱状上皮核与杯状细胞淡区、黏膜下层、内环/外纵肌核与浆膜层。粉紫色素透明叠染、软边与细颗粒；不使用彩色碎屑。S12分叶核炎细胞增多；S15坏死焦点避开完整核，只有淡染无核轮廓。
- [x] 标签为细引线、浅紫字、无文字框；全图小框仅用于解剖定位。
- [x] 关键帧每句1–2张，附200%局部与review_sheet.png；before_after.png并排比较baf3b0f的r2与本轮。
- [x] 原创代码自绘，无网图/照片、姓名、学校或新增研究数字；正文依分镜/定稿。
- [x] 确定性已通过render.mjs换序检查，详见../{scene}_build_r3.log。
- [x] 单渲染进程、workers=1；视频1080p、30fps、CRF16；720p含全稿_v3真实旁白，以timeline.json句首/末截取，句间自然停顿保留。
- [x] 音视频实际时长与句边界差小于0.15秒，ffprobe结果见media_check.json。句区间时长{m['duration']:.6f}秒。
- [x] 未改main.js、timeline.js和锁定文件；哈希见../r3/sha256_start.log与最终sha256_end.log。

医学与表现边界：CT与组织均为教学示意，非真实扫描/玻片；没有加入HU、管径阈值或分型准确度。双窗只显示形态对应，不意味着同一切片方向或CT可独立判断病理类型。组织窗保持层次对应，细节精度仍低于专门高倍镜下场景；需要主审最终确认视觉风格。

提交：原worktree的Git元数据只读，按任务允许的备用方式在/tmp/ct-fix01-r3.git逐场提交，并汇总qa/v6/ct/ct-dev.bundle。未合并或push。
'''
if scene=='S04':
 text=text.replace('- [x] 全图阑尾位置', '- [x] 自绘CT全图阑尾位置')
(p/'自检.md').write_text(text)
print(scene,'safe frames',len(checks),'duration',m['duration'])
