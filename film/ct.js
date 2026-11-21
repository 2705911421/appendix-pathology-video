import {INK, arrow, blob, box, ease, ellipse, layer, prng, shape, line, label} from './art.js';
import {msct} from './references.js';

const FIELD = '#1A1D22';
const FAT = '#383D47';
const SOFT = '#686E78';
const BONE = '#EAECEF';
const AIR = '#0B0D10';
export const CT_REGION = [53, 96, 104, 79];

function axial(g, state) {
  const rand = prng(310);
  g.fillStyle = FIELD; g.fillRect(0, 0, 410, 250);
  const body = 'M16 123 C18 49 83 28 146 35 Q179 39 194 24 Q207 17 219 26 C245 45 277 35 303 36 C371 42 397 77 394 125 C392 191 342 227 273 225 C230 228 216 248 174 234 C104 220 18 214 16 123Z';
  shape(g, body, FAT, '#989DA6', 2);
  g.save(); g.clip(new Path2D(body));
  const shade = g.createRadialGradient(200, 125, 70, 200, 125, 200);
  shade.addColorStop(0, '#474D56'); shade.addColorStop(1, '#242934');
  shape(g, body, shade);
  shape(g, 'M45 130 Q71 171 141 182 L141 209 Q79 203 45 179 Q33 152 45 130Z M369 130 Q351 175 278 184 L279 211 Q342 206 368 174Z', SOFT, '#A2A7AD', 1.2);
  shape(g, 'M198 173 Q216 161 232 174 L247 186 L244 204 L227 213 L222 229 L204 223 L201 210 L181 201 L181 184Z', BONE, '#A5ABB1', 1.4);
  ellipse(g, 212, 190, 22, 13, '#A2A6AE', '#DFE3E8', 2);
  ellipse(g, 213, 211, 8, 5, '#313640');
  shape(g, 'M52 148 Q63 179 129 189 L152 207 Q110 206 72 189 Q63 181 48 163Z M358 145 L365 166 Q342 192 287 208 L267 211 L285 192 Q325 174 358 145Z', BONE, '#A8AFB5', 2);
  shape(g, 'M61 159 Q84 181 132 196 M349 161 Q322 184 281 202', null, '#91969E', 3);
  ellipse(g, 155, 162, 20, 27, '#747883', '#888E99', 1, -.4); ellipse(g, 269, 164, 20, 25, '#747883', '#888E99', 1, .4);
  ellipse(g, 204, 148, 8, 10, '#A3AAB4'); ellipse(g, 233, 146, 8, 10, '#8A949D');
  for (let i = 0; i < 12; i++) {
    const x = 86 + (i % 6) * 47 + rand() * 20;
    const y = 57 + Math.floor(i / 6) * 50 + rand() * 17;
    const rx = 11 + rand() * 14, ry = 8 + rand() * 12;
    blob(g, x, y, rx + 4, ry + 4, '#686D75', i + 23);
    blob(g, x, y, rx, ry, i % 4 ? AIR : '#4E555E', i + 23);
    if (i % 3 === 0) blob(g, x + 5, y + 2, rx * .5, ry * .46, '#8C9195', i + 28);
  }
  for (let i = 0; i < 5500; i++) {
    const x = rand() * 410, y = rand() * 250;
    g.fillStyle = i % 3 ? '#E8EAF211' : '#0D0E131E';
    g.fillRect(x, y, .8 + rand() * 2, .8 + rand() * 1.65);
  }
  // Radiological convention: the patient's right is at image left.
  const xx = 92, yy = 132;
  if (state > 0) {
    const cloud = g.createRadialGradient(xx, yy, 7, xx+4, yy, 54);
    cloud.addColorStop(0, state === 1 ? '#A2A5AE69' : '#9CA0AA34');
    cloud.addColorStop(1, '#A2A5AE00');
    ellipse(g, xx+4, yy, 57, 38, cloud);
    for (let i = 0; i < (state === 1 ? 46 : 24); i++) {
      const a = rand() * Math.PI * 2, r = 14 + rand() * 32;
      const x = xx + r * Math.cos(a), y = yy + .76 * r * Math.sin(a);
      const d = 4 + rand() * 13;
      shape(g, `M${x} ${y}q${d*.45*Math.cos(a)-3} ${d*.45*Math.sin(a)+2} ${d*Math.cos(a)} ${d*Math.sin(a)}`,
        null, i % 3 ? '#C4C8D473' : '#979CA8A0', 1 + rand() * 2.3);
    }
  }
  if (state === 2) {
    blob(g, 127, 151, 25, 16, '#272E39', 57, '#969CA5');
    ellipse(g, xx, yy, 15, 12, '#414550');
    const rim = new Path2D();
    rim.ellipse(xx, yy, 14, 11.5, -.15, .63, Math.PI * 2 - .67);
    shape(g, rim, null, '#8B909A', 5.4);
    for (const [x,y,r] of [[117,135,5],[133,135,3.2],[121,119,4],[132,145,2.4]]) {
      ellipse(g, x, y, r, r*.92, AIR, '#707782', .7);
    }
  } else if (state === 1) {
    ellipse(g, xx, yy, 16, 13, '#BCC4CF', '#88939D', 1.4);
    ellipse(g, xx, yy, 12.4, 9.4, '#E8EAF4', '#B4BBC6', .95);
    ellipse(g, xx, yy, 8.4, 6.3, '#525A65');
    ellipse(g, xx + 2.6, yy + 1.4, 2.95, 2.95, '#F7F9FA');
  } else {
    ellipse(g, xx, yy, 9.5, 8.2, '#B0B8C4');
    ellipse(g, xx, yy, 5.8, 4.8, '#424A55');
  }
  g.restore();
  line(g, [[365,216],[387,216]], '#E9EAED', 2.8);
}

export function ctAssets() {
  const resolution = 3;
  return Array.from({length: 3}, (_, i) => {
    const plate = layer(410*resolution, 250*resolution, g => {
      g.scale(resolution,resolution);
      axial(g, i);
    });
    const inset = layer(336, 244, g => {
      g.imageSmoothingQuality = 'high';
      g.drawImage(plate, ...CT_REGION.map(value=>value*resolution), 0, 0, 336, 244);
    });
    return {plate, inset};
  });
}

const cards = [
  {title:'单纯性', accent:'#9D4237', notes:['管径轻度增粗','示例：>6 mm','脂肪间隙清晰'],
    targets:[[92,132,8,25],[119,153,165,103]]},
  {title:'蜂窝织炎性（化脓性）', accent:'#735218', notes:['管壁增厚强化','脂肪絮状渗出'],
    targets:[[96,124,152,16],[120,152,164,95]]},
  {title:'坏疽／穿孔征象', accent:'#52334C', notes:['局部管壁中断','周围可见积液','游离气体小泡'],
    targets:[[105,131,159,59],[130,153,152,101],[120,120,118,11]]},
];

export function scanWeights(active, elapsed) {
  const amount = ease(elapsed / 1.02);
  return cards.map((_, index) => index === active ? amount : active > 0 && index === active - 1 ? 1 - amount : 0);
}

export function drawScanCards(g, assets, active, elapsed, overviewDoctor) {
  const weights = scanWeights(active, elapsed);
  const overall = Math.max(...weights);
  const insetsY = 294, insetWidth = 168, insetHeight = 122;
  const width = 403, gap = 18, height = 430;
  const drift = .009 * (1 - Math.cos(elapsed*1.68));
  const scales = weights.map(w => 1 - .125 * overall + (.375 - drift) * w);
  const panelWidth = scales.reduce((sum, scale) => sum + scale * width, 0) + gap*2;
  let x = 1200 - panelWidth/2;

  line(g, [[556,109],[556,168]], '#8A4754', 5);
  label(g,'多层螺旋 CT · 三型影像',579,157,52,'#713945',820);
  label(g,'看管径、管壁和周围脂肪',558,226,31,'#4A3F42',650);
  if (active === -1) {
    g.save(); g.globalAlpha = 1 - ease((elapsed - 2.25) / .75);
    g.translate(1828+6*Math.sin(elapsed*1.35),54);
    g.scale(-.61,.43);
    g.drawImage(overviewDoctor,0,0);
    g.restore();
  }
  for (const [i,card] of cards.entries()) {
    const scale = scales[i], focus = weights[i];
    const y = 284 + (1-focus) * 20;
    g.save(); g.translate(x,y); g.scale(scale,scale);
    box(g,0,0,width,height,16,focus > .25 ? '#FDF5E4' : '#F9F3ED',focus > .25 ? '#BE8C39' : '#B79D91', 1.6+3*focus);
    label(g,card.title,13,35,29,card.accent,820);
    g.save(); g.globalAlpha *= 1 - .65 * (overall-focus);
    g.drawImage(assets[i].plate,10,48,383,233.5);
    const [rx,ry,rw,rh] = CT_REGION;
    const imageScale = 383/410;
    g.save(); g.setLineDash([7,5]); g.lineDashOffset = -elapsed*16*focus;
    box(g,10+rx*imageScale,48+ry*imageScale,rw*imageScale,rh*imageScale,3,null,'#E5C86A',1.5+2*focus);
    g.restore();
    g.drawImage(assets[i].inset,10,insetsY,insetWidth,insetHeight);
    box(g,10,insetsY,insetWidth,insetHeight,4,null,focus > .25 ? '#B58539' : '#98867A',1.8);
    if (focus > .05) {
      for (const [j, [px,py,sx,sy]] of card.targets.entries()) {
        const reveal = ease((elapsed - .24 - j*.55) / .68) * focus;
        if (reveal <= 0) continue;
        const tx = 10 + (px-rx)*insetWidth/rw, ty = insetsY + (py-ry)*insetHeight/rh;
        g.save(); g.globalAlpha *= reveal*(.89+.11*Math.sin(elapsed*3.2-j));
        const pulse = .5 + .5*Math.sin(elapsed*3.2-j);
        const length = .65+.35*reveal-.11*pulse;
        const fromX=tx+(10+sx-tx)*length, fromY=ty+(insetsY+sy-ty)*length;
        line(g,[[fromX,fromY],[tx,ty]],'#FFF2D8',5);
        arrow(g,fromX,fromY,tx,ty,'#C32F37',2.5);
        g.restore();
      }
    }
    g.restore();
    box(g,20,59,31,35,5,'#23272D');
    label(g,'R',25,86,31,'#FFFFFF',700,'left','dark');
    for (const [j, text] of card.notes.entries()) label(g,text,188,323+j*37,28,j === 0 ? INK : '#494143',j===0 ? 770 : 620);
    g.restore();
    x += scale*width + gap;
  }
  label(g,`教学示意 · 征象结合病理 · ${msct.journal}，${msct.year}`,556,864,28,'#4A3F42',620);
}
