// 07 科学就医 — sentences 28–31. Entry = 06 exit (person + peritonitis wash, EXIT_CAM6).
// Pull back to the person; inflammation ≠ enemy / ≠ infection; antibiotics crossed out; thesis; early care.
// After T.DUR_CONTENT: quiet 12 s end card (创作说明, blind-review safe).
import { C, W, H } from '../lib/tokens.js';
import * as A from '../lib/ann.js';
import { drawWash } from '../lib/wash.js';
import { ink } from '../lib/ink.js';
import { FIG, drawFigure, drawArmR, drawInsitu } from '../lib/figure.js';
import { win, fade, clamp, titleBlock } from '../lib/chapter.js';
import { EXIT_CAM6 } from './06.js';
import { ease, seg } from '../lib/motion.js';
const I0 = 28, s = i => I0 + i;
const lerp = (a, b, k) => a + (b - a) * k;
const sm = (t, a, b) => { const k = clamp((t - a) / (b - a || 1e-9)); return k * k * (3 - 2 * k); };
const CAM_PERSON = { x: 960, y: 480, zoom: 1.0 };
export const EXIT_CAM7 = CAM_PERSON;

function drawEndCard(ctx, t, T) {
  // 12 s end card = two soft-crossfaded cards (A 创作说明 / B 音乐+参考文献). Blind-review safe.
  const u = t - T.DUR_CONTENT, kb = .55;
  const kA = sm(u, 0, 1.0) * (1 - sm(u, 5.9, 6.6)), kB = sm(u, 6.3, 7.2);
  ctx.fillStyle = window.__mood.paper; ctx.fillRect(0, 0, W, H);
  const kF = Math.max(sm(u, 0, 1.0), kB);
  ctx.save(); ctx.globalAlpha = kF;
  ink(ctx, 'c07.endframe', 'rectangle', [120, 70, W - 240, H - 140], { strokeWidth: 1.6, roughness: .5, seed: 701 });
  ctx.restore();
  const X = 240, L = (txt, y, o = {}) => A.label(ctx, txt, X, y, { size: 30, alpha: .92, w: 500, ...o });
  if (kA > 0) {
    ctx.save(); ctx.globalAlpha = kA;
    A.label(ctx, '疼会“搬家”的7厘米盲管', W / 2, 160, { size: 50, align: 'center', k: kA, w: 700 });
    A.label(ctx, '从急性阑尾炎，看懂身体的炎症保卫战', W / 2, 222, { size: 30, align: 'center', k: kA, alpha: .75, w: 500 });
    ink(ctx, 'c07.endrule', 'line', [360, 262, 1560, 262], { strokeWidth: 1.4, seed: 702 });
    A.label(ctx, '创作说明', X, 330, { size: 44, k: kA, col: C.red, w: 800 });
    ['本作品使用生成式人工智能辅助创作，用途如下：',
     '· 代码动画：garden-skills / motion-showreel（Rough.js 墨线 · p5.brush 水彩）',
     '· 文本辅助：旁白脚本起草、润色与分镜编排（AI 工具：【待填】）',
     '· 旁白配音：小米 MiMo TTS（依据定稿字幕生成）',
     '· 图像生成：未进入本版成片（画面均为代码绘制）',
     '· 配乐：AI 辅助编写 MIDI 乐谱，以开源乐器采样渲染',
     '科学表述经人工核对，依据人卫《病理学》第 9 版及 WSES 指南等；',
     '未使用未授权病理照片。',
    ].forEach((txt, i) => L(txt, 390 + i * 52, { k: kA, size: 28 }));
    ctx.restore();
  }
  if (kB > 0) {
    ctx.save(); ctx.globalAlpha = kB;
    A.label(ctx, '背景音乐', X, 160, { size: 44, k: kB, col: C.red, w: 800 });
    // v7b required attribution (Salamander CC BY 3.0 + VSCO 2 CE CC0). No Kevin MacLeod.
    ['钢琴采样：Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0',
     '(http://creativecommons.org/licenses/by/3.0/)',
     '管弦乐采样：VSCO 2 Community Edition by Versilian Studios (CC0)',
    ].forEach((txt, i) => L(txt, 220 + i * 44, { k: kB, size: 26, alpha: i === 1 ? .82 : .92 }));
    A.label(ctx, '参考文献', X, 470, { size: 44, k: kB, col: C.red, w: 800 });
    ['[1] 步宏, 李一雷. 病理学[M]. 9版. 北京: 人民卫生出版社, 2018.',
     '[2] CARR N J. The pathology of acute appendicitis[J]. Ann Diagn Pathol, 2000, 4(1): 46-58.',
     '[3] DI SAVERIO S, PODDA M, DE SIMONE B, et al. Diagnosis and treatment of acute',
     '      appendicitis: 2020 update of the WSES Jerusalem guidelines[J].',
     '      World J Emerg Surg, 2020, 15(1): 27.',
    ].forEach((txt, i) => L(txt, 540 + i * 54 + (i >= 1 ? 10 : 0) + (i >= 2 ? 10 : 0), { k: kB, size: 26 }));
    ctx.restore();
  }
  drawWash(ctx, 'c07.endwash', 1700, 900, 260 * kb, { alpha: .2 * kF });
  drawWash(ctx, 'c07.endwash', 230, 910, 180, { alpha: .1 * kF });
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1;
    A.dot(ctx, [240 + i * 280 % 1440, 950 + 6 * Math.sin(a)], { r: 2.2, col: C.ink, k: kF * .35 });
  }
}

export default {
  id: '07', drift: true, boil: true, boilAlways: (t, T) => t < T.DUR_CONTENT,   // mood_v2d: Rough.js line boil like 01–05 (not on the end cards)
  bake(bake) {
    bake('c07.focus', (b, P) => { P.fill(b, P.blob(0, 0, 260, 24, .35, 71), C.red, 120, .3, [.5, .6]); }, { seed: 71 });
    bake('c07.endwash', (b, P) => { P.fill(b, P.blob(0, 0, 360, 28, .4, 73), C.red, 60, .35); }, { seed: 73 });
    bake('c07.rash', (b, P) => { for (let i = 0; i < 9; i++) P.fill(b, P.blob(-40 + (i % 3) * 40, -40 + Math.floor(i / 3) * 40, 28, 10, .5, 80 + i), C.red, 140, .2); }, { seed: 74 });
  },
  // Preserve v4 no-overlap zones: patient / hospital left, every argument and label right.
  // Deliberate quiet cut from 06, no compulsory drifting or pencil-boil here.
  camera: T => [
    [T.at(s(0)), { x: 960, y: 500, zoom: .96 }],
    [T.at(s(1)), { x: 960, y: 500, zoom: .96 }],
    [T.end(s(1)), { x: 960, y: 490, zoom: 1.0 }, ease.linear],
    // mood_v2d: clearly noticeable slow push 224 → 238.8 s (+9 % scale), drifting toward the patient
    [T.end(s(2)), { x: 930, y: 486, zoom: 1.045 }, ease.inOutSine],
    [T.end(s(3),-.5), { x: 900, y: 480, zoom: 1.09 }, ease.inOutSine],
    [T.end(s(3)), { x: 900, y: 480, zoom: 1.09 }],
  ],
  world(ctx,t,T) {
    if(t>=T.DUR_CONTENT)return;
    const mt=Math.min(t,T.end(s(3),-.5)), quiet=t<T.at(s(1));
    // Last half-second holds the complete care image; end cards replace it without a blank gap.
    const walk=sm(t,T.frac(s(1),.4),T.end(s(1))), DX=-480+90*walk;
    const bt_=t-(T.at(s(0))), breath=(quiet?1.8:2.4)*Math.sin(t*2*Math.PI/3.6), sway=(quiet?3.5:5)*Math.sin(t*.5)+1.4*Math.sin(t*1.07+2);   // mood_v2d: visible breathing (≈1.7% chest rise) + ±6 px sway
    const blink=[3.1,7.9,12.6,17.2,21.4,26.3,30.8].some(b=>bt_>=b&&bt_<b+.13)?1:0;
    ctx.save();ctx.translate(DX,0);
    drawFigure(ctx,{face:'mild',breath,sway,blink,hatch:.55});
    drawArmR(ctx,{pose:t<T.frac(s(3),.35)?'clutch':'rest',rub:[sway,-.6*breath]});
    drawInsitu(ctx,{k:fade(t,T.frac(s(0),.3),T.frac(s(0),.55),T.frac(s(3),.7),T.end(s(3))),alpha:.75});
    const kFocus=fade(t,T.frac(s(2),.1),T.frac(s(2),.35),T.frac(s(3),.8),T.frac(s(3),.9));
    drawWash(ctx,'c07.focus',FIG.mcb[0],FIG.mcb[1],120,{grow:kFocus,alpha:kFocus*.62});ctx.restore();
    // Hospital occupies the LEFT zone edge (world x 820..940). No labels on top of the patient.
    const kH=win(t,T.frac(s(1),.12),T.frac(s(1),.24));
    if(kH>0){const hx=880,hy=610;ctx.save();ctx.globalAlpha*=kH;
      ink(ctx,'c07.door','rectangle',[hx-60,hy-112,120,224],{strokeWidth:2.4,seed:710});
      ink(ctx,'c07.doorin','rectangle',[hx-34,hy-78,68,154],{strokeWidth:1.8,seed:711});
      ink(ctx,'c07.knob','circle',[hx+18,hy+8,8],{fill:C.red,fillStyle:'solid',seed:712});
      ink(ctx,'c07.crossV','line',[hx,hy-164,hx,hy-130],{stroke:C.red,strokeWidth:5,seed:713});
      ink(ctx,'c07.crossH','line',[hx-17,hy-147,hx+17,hy-147],{stroke:C.red,strokeWidth:5,seed:714});
      A.label(ctx,'医院',hx,hy-195,{size:26,align:'center'});
      A.arrow(ctx,[670,790],[hx-75,hy+45],{col:C.red,w:2.4,head:14,k:walk});ctx.restore();
    }
  },
  screen(ctx, t, T) {
    if (t >= T.DUR_CONTENT) { drawEndCard(ctx, t, T); return; }
    const outro = 1;
    ctx.save(); ctx.globalAlpha = outro;
    const TX = 1400;   // text-zone centre
    const k0 = fade(t, T.at(s(0)), T.at(s(0), .12), T.end(s(0), -.35), T.end(s(0))); 
    if (k0 > 0) {
      A.label(ctx, '炎症本身', TX, 330, { size: 66, w: 700, align: 'center', k: k0 });
      A.label(ctx, '不是敌人', TX, 420, { size: 60, w: 700, align: 'center', col: C.red, k: k0 });
      A.label(ctx, '失控的炎症', TX, 530, { size: 44, w: 700, align: 'center', k: win(t, T.frac(s(0), .6), T.frac(s(0), .75)) * k0, col: C.red });
      A.label(ctx, '才是真正的威胁', TX, 590, { size: 32, w: 500, align: 'center', k: win(t, T.frac(s(0), .68), T.frac(s(0), .82)) * k0, alpha: .85 });
    }
    // Compact right-zone cards preserve the left patient/hospital slow move; warning lives BELOW the cards.
    const k1 = fade(t, T.at(s(1), .12), T.frac(s(1), .10), T.end(s(1), -.35), T.end(s(1))); 
    if (k1 > 0) {
      A.label(ctx, '发炎  ≠  细菌感染', TX, 190, { size: 48, align: 'center', w: 700, k: k1, col: C.red });
      [{ x: 1090, name: '扭伤', sub: '机械损伤' }, { x: 1400, name: '过敏', sub: '免疫反应' }, { x: 1710, name: '痛风', sub: '结晶沉积' }].forEach((it, i) => {
        const k = win(t, T.frac(s(1), .16 + i * .07), T.frac(s(1), .26 + i * .07)) * k1, y = 330;
        ctx.save(); ctx.globalAlpha *= k; ink(ctx, `c07.card${i}`, 'rectangle', [it.x - 125, y - 75, 250, 180], { strokeWidth: 2, seed: 720 + i }); ctx.restore();
        if (i === 1) drawWash(ctx, 'c07.rash', it.x + 125, y - 75, 60, { alpha: .45 * k });     // wash on the card corner, not under text
        A.label(ctx, it.name, it.x, y - 18, { size: 38, align: 'center', k, w: 700 });
        A.label(ctx, it.sub, it.x, y + 34, { size: 24, align: 'center', k, alpha: .75, w: 500 });
        A.label(ctx, '也会发炎', it.x, y + 72, { size: 24, align: 'center', k, col: C.red, w: 500 });
      });
      const ka = win(t, T.frac(s(1), .55), T.frac(s(1), .65)) * k1;
      if (ka > 0) {
        const bx = 1090, by = 680;
        ctx.save(); ctx.globalAlpha *= ka;
        ink(ctx, 'c07.bottle', 'rectangle', [bx - 45, by - 70, 90, 120], { strokeWidth: 2.4, seed: 730 });
        ink(ctx, 'c07.cap', 'rectangle', [bx - 32, by - 94, 64, 26], { strokeWidth: 2, seed: 731 });
        ctx.restore();
        A.label(ctx, '抗生素', bx, by - 6, { size: 24, align: 'center', k: ka, w: 700 });
        A.line(ctx, [bx - 85, by + 75], [bx + 85, by - 110], { k: win(t, T.frac(s(1), .68), T.frac(s(1), .76)) * ka, col: C.red, w: 5 });
        A.label(ctx, '不要自行服用', 1240, by - 30, { size: 40, k: win(t, T.frac(s(1), .72), T.frac(s(1), .8)) * ka, col: C.red, w: 700 });
        A.label(ctx, '不对症 · 还可能掩盖病情', 1240, by + 30, { size: 28, k: win(t, T.frac(s(1), .76), T.frac(s(1), .84)) * ka, alpha: .8, w: 500 });
      }
    }
    const k2 = fade(t, T.frac(s(2), .05), T.frac(s(2), .2), T.frac(s(2), .85), T.end(s(2)));
    if (k2 > 0) {
      A.label(ctx, '读懂这一根阑尾', TX, 360, { size: 52, align: 'center', w: 700, k: k2 });
      A.label(ctx, '＝', TX, 440, { size: 44, align: 'center', w: 700, k: k2, alpha: .7 });
      A.label(ctx, '读懂炎症', TX, 520, { size: 52, align: 'center', w: 700, k: win(t, T.frac(s(2), .2), T.frac(s(2), .35)) * k2, col: C.red });
      A.label(ctx, '最基本的规律', TX, 590, { size: 40, align: 'center', w: 700, k: win(t, T.frac(s(2), .28), T.frac(s(2), .42)) * k2, col: C.red });
    }
    const k3 = win(t, T.at(s(3)), T.frac(s(3), .15));
    if (k3 > 0) {
      A.label(ctx, '转移性右下腹痛 · 发热 · 拒按', TX, 190, { size: 36, align: 'center', w: 700, k: k3 });
      A.label(ctx, '别硬扛 —— 早一点交给医生', TX, 262, { size: 44, align: 'center', w: 700, k: win(t, T.frac(s(3), .25), T.frac(s(3), .4)) * k3, col: C.red });

      A.label(ctx, '给身体这场保卫战，最好的支援', TX, 830, { size: 32, align: 'center', w: 500, k: win(t, T.frac(s(3), .55), T.frac(s(3), .7)) * k3, alpha: .85 });
    }
    ctx.restore();
  },
  title(ctx, t, T) {
    if (t >= T.DUR_CONTENT) return;
    const outro = 1;
    ctx.save(); ctx.globalAlpha = outro;
    titleBlock(ctx, t, T.frac(s(0), .05), '07 · 科学就医', '失控才是敌人', 5);
    ctx.restore();
  },
};
