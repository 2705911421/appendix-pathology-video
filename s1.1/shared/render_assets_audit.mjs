import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { ileocecalDimensions } from './anatomyWatercolor.js';
import { histologyRecipe } from './histologyProcedural.js';
import { CT_ROI, CT_ZOOM } from './ctRenderer.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const width = 2400;
const height = 1800;
const locale = 'zh-CN';
const stageNames = ['normal', 'simple', 'phlegmon', 'gangrene', 'chronic'];
for (const [i, stage] of stageNames.entries()) {
  const model = ileocecalDimensions(stage);
  assert.equal(model.cecum, 150);
  assert.equal(model.ileum, 63);
  assert.equal(model.appendix, [16.5, 25.5, 37.5, 40.5, 24][i]);
  assert.ok(model.length >= 205 && model.length <= 245, 'Appendiceal arc length');
  assert.ok(model.appendix < model.ileum);
  console.log(stage, model, histologyRecipe(stage));
}
assert.equal(CT_ZOOM, 2.4);
assert.ok(CT_ROI.x + CT_ROI.width < 642 / 2, 'Region must be on the image R side');

async function presentBoard() {
  const margin = 72;
  const column = (width - margin * 2) / 5;
  const cases = [
    { key:'normal', label:'正常', color:'#A45C55', gross:'16.5 px · 纤细粉白' },
    { key:'simple', label:'单纯性', color:'#A93130', gross:'25.5 px · 浆膜血管充盈' },
    { key:'phlegmon', label:'化脓性', color:'#89621F', gross:'37.5 px · 厚壁窄腔与粪石' },
    { key:'gangrene', label:'坏疽穿孔', color:'#572D38', gross:'40.5 px · 焦黑破口与渗液' },
    { key:'chronic', label:'慢性纤维化', color:'#8C5263', gross:'24.0 px · 厚壁窄腔横切面' },
  ];
  const ctNotes = [
    '轻度增粗 · 薄壁轻强化 · 脂肪清晰',
    '厚壁靶征 · 偏心粪石 · 斑片状脂肪条索',
    '壁强化中断 · 盲肠旁脓肿 · 4 枚腔外气泡',
  ];
  const text = (label,x,y,style,attrs='') =>
    `<text x="${x}" y="${y}" class="${style}" ${attrs}>${assertBlindReviewText(label)}</text>`;
  const centred = (label,x,y,style,color) =>
    text(label,x,y,style,`text-anchor="middle"${color?` fill="${color}"`:''}`);
  const rule = y => `<path d="M${margin} ${y}H${width-margin}" stroke="#A88A73" stroke-width="1.2" opacity=".52"/>`;
  const header = (y,left,right) => text(left,margin,y,'section-title')
    + text(right,width-margin,y,'section-detail','text-anchor="end"');

  const organs=cases.map(({key},i)=>createIleocecalAsset({
    id:`audit-organ-${key}`, stage:key, x:margin+column*i-74, y:208, scale:.92,
    cutaway:key==='phlegmon', showThrombus:key==='gangrene',
  }));
  const slices=cases.map(({key},i)=>{
    const brackets=key==='simple'||key==='chronic';
    const diameter=368;
    return createHistologyAsset({id:`audit-he-${key}`,stage:key,seed:8053+i*1709,
      x:margin+column*i+(brackets?67:(column-diameter)/2),y:823,
      scale:diameter/HISTOLOGY_DIAMETER,showLayers:brackets});
  });
  await prepareCTBackdrop();
  const images=cases.slice(1,4).map(({key},i)=>createCTAsset({
    id:`audit-ct-${key}`,stage:key,x:margin+i*(width-margin*2)/3+22,y:1385,scale:.66,
  }));
  const micro = [
    `${slices[0].audit.crypts} 个隐窝 · ${slices[0].audit.follicles} 个淋巴滤泡`,
    `中性粒细胞 · 浅层 ${slices[1].audit.shallow} · 肌层 ${slices[1].audit.muscle}`,
    `${slices[2].audit.shallow+slices[2].audit.muscle} 个全层中性粒细胞 · 浆膜纤维素脓苔`,
    '出血坏死、核溶解与脓性穿孔裂隙',
    '胶原束间透光 · 5 簇淋巴与浆细胞',
  ];
  function svg(host,markup){
    const layer=document.createElementNS(NS,'svg');
    layer.setAttribute('viewBox',`0 0 ${width} ${height}`);
    layer.innerHTML=markup;
    document.querySelector(host).append(layer);
    return layer;
  }
  const cards=[...organs,...slices,...images];
  const art=svg('#assets',cards.map(asset=>asset.paint).join(''));
  cards.forEach(asset=>asset.mount(art));
  svg('#notes',[
    text('s1.1 核心医学资产全检板',margin,91,'board-title'),
    text('Gate 0.9 · 程序绘制教学示意',width-margin,90,'section-detail','text-anchor="end"'),
    rule(128),
    header(176,'回盲部 · 正面观','标本同尺度　盲肠 150 px　回肠末端 63 px'),
    ...cases.map(({label,color,gross},i)=>{
      const x=margin+(i+.5)*column;
      return centred(label,x,228,'stage-name',color)+centred(gross,x,698,'feature');
    }),
    rule(721),
    header(769,'H&E · 阑尾组织','正常全横断面　四种病变局部视野'),
    ...cases.map(({label,color},i)=>{
      const x=margin+(i+.5)*column;
      return centred(label,x,812,'stage-name',color)+slices[i].lettering+centred(micro[i],x,1237,'feature');
    }),
    rule(1267),
    header(1313,'轴位 CT · 右髂窝','图像左侧为患者右侧　虚线框对应同源 2.4× 放大窗'),
    ...cases.slice(1,4).map(({label,color},i)=>{
      const x=margin+(i+.5)*(width-margin*2)/3;
      return centred(label,x,1363,'stage-name',color)+images[i].lettering+centred(ctNotes[i],x,1747,'feature');
    }),
  ].join(''));
  const [paper]=await Promise.all([
    createPaper(document.querySelector('#paper'),{width,height}),document.fonts.ready,
  ]);
  paper(-1);
  window.renderAt=time=>organs[3].update(art,{time});
  window.renderAt(1.6);
  const root=document.querySelector('main');
  root.dataset.audit=JSON.stringify({
    organs:organs.map(asset=>asset.audit),
    slices:slices.map(({lens,audit})=>({lens,audit})),
    images:images.map(({zoom,main,audit})=>({zoom,main,audit})),
  });
  root.dataset.ready='true';
}

const browserEntry=`
import { assertBlindReviewText, createPaper, NS } from './canvasCore.js';
import { createIleocecalAsset } from './anatomyWatercolor.js';
import { createHistologyAsset, HISTOLOGY_DIAMETER } from './histologyProcedural.js';
import { createCTAsset, prepareCTBackdrop } from './ctRenderer.js';
const width = ${width}, height = ${height};
await (${presentBoard.toString()})();
`;
const { outputFiles: [source] } = await build({
  stdin:{contents:browserEntry,resolveDir:here,sourcefile:'assets-gate09-browser.js'},
  bundle:true,write:false,format:'esm',platform:'browser',target:'chrome120',
  define:{IS_MINIFIED:'true'},
});
const p5 = await readFile(new URL(`../translations/${locale}/extracted.json`, import.meta.resolve('p5')));
const html = `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>s1.1 核心医学资产全检板</title>
<style>
  :root { font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif; color: #221F1C; }
  body { margin: 0; background: #F5F1E9; }
  main {
    position: relative; width: ${width}px; height: ${height}px; overflow: hidden; isolation: isolate;
    background-color: #F5F1E9;
    background-image: linear-gradient(to right, rgba(120,110,95,.055) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(120,110,95,.055) 1px, transparent 1px);
    background-size: 42px 42px; background-position: 15px 11px;
  }
  #assets, #notes, #paper, #paper canvas, svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  #paper { pointer-events: none; }
  .board-title, .section-title, .stage-name, .micro-layer {
    font-family: "Noto Serif SC", "KaiTi", serif;
  }
  .board-title { font-size: 57px; font-weight: 730; letter-spacing: 1px; fill: #221F1C; }
  .section-title { font-size: 35px; font-weight: 710; fill: #332925; }
  .section-detail { font-size: 22px; font-weight: 520; fill: #655449; }
  .stage-name { font-size: 31px; font-weight: 730; }
  .feature { font-size: 22px; font-weight: 560; fill: #503E38; }
  .micro-layer { font-size: 29px; font-weight: 680; fill: #5E433D; }
  .ct-magnification { font-size: 21px; font-weight: 650; fill: #783A32; }
</style>
<main><div id="assets"></div><div id="paper"></div><div id="notes"></div></main>
<script src="/board.js" type="module"></script>
</html>`;

const routes = new Map([
  ['/', ['text/html; charset=utf-8', html]],
  ['/board.js', ['text/javascript; charset=utf-8', source.contents]],
  [`/${locale}.json`, ['application/json; charset=utf-8', p5]],
]);
const server = createServer((request, response) => {
  const key = new URL(request.url, 'http://localhost').pathname;
  if (key === '/favicon.ico') return response.writeHead(204).end();
  const entry = routes.get(key);
  if (!entry) return response.writeHead(404).end();
  return response.writeHead(200, { 'Content-Type': entry[0] }).end(entry[1]);
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

const executablePath = process.env.CHROME_PATH;
const args = ['--force-color-profile=srgb', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
function lensBrightness(pixels,lens) {
  const radius=lens.diameter/2-4;
  let count=0,total=0,pale=0;
  for(let y=Math.ceil(lens.y-radius);y<lens.y+radius;y++)for(let x=Math.ceil(lens.x-radius);x<lens.x+radius;x++){
    if((x+.5-lens.x)**2+(y+.5-lens.y)**2>radius**2)continue;
    const i=(y*width+x)*3;
    const l=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
    total+=l;
    count++;
    if(l>=220)pale++;
  }
  return {mean:total/count,paleFraction:pale/count};
}

function assertMedicalLooks(pixels,audit) {
  const brightness=[0,1,4].map(i=>({stage:stageNames[i],...lensBrightness(pixels,audit.slices[i].lens)}));
  for(const {stage,mean,paleFraction} of brightness)
    console.log(`H&E ${stage} | L_mean ${mean.toFixed(2)} | L≥220 ${(paleFraction*100).toFixed(1)}%`);
  for(const {stage,mean} of brightness) assert.ok(mean>=192&&mean<=232,`${stage} H&E luma outside 192–232: ${mean.toFixed(2)}`);

  const [normal,simple,phlegmon,gangrene,chronic]=audit.slices.map(({audit})=>audit);
  assert.equal(normal.crypts,44);
  assert.equal(normal.follicles,7);
  assert.equal(normal.vessels,11);
  assert.ok(simple.shallow>=210&&simple.shallow<=240);
  assert.equal(simple.muscle,4);
  assert.equal(simple.muscleStrokes,65);
  assert.equal(simple.muscleNuclei,150);
  assert.ok(phlegmon.shallow+phlegmon.muscle>=900);
  assert.ok(phlegmon.serosalPus>=140);
  assert.equal(phlegmon.freePus,25);
  assert.ok(phlegmon.fibrin>=60&&phlegmon.fibrin<=75);
  console.log(`H&E cells | simple shallow/muscle ${simple.shallow}/${simple.muscle} | phlegmon wall ${phlegmon.shallow+phlegmon.muscle} | serosal pus ${phlegmon.serosalPus}`);
  assert.equal(gangrene.crypts,0);
  assert.ok(gangrene.clouds>=18&&gangrene.clouds<=24);
  assert.ok(gangrene.fissurePus>=120&&gangrene.fissureRedCells>=90);
  const cross=audit.organs[4].crossSection;
  assert.equal(cross.diameter,78);
  assert.equal(cross.centre[0]-cross.anchor[0],125);
  assert.equal(cross.centre[1]-cross.anchor[1],75);
  assert.equal(chronic.crypts,6);
  assert.equal(chronic.bundles,40);
  assert.equal(chronic.fibroblasts,140);
  assert.equal(chronic.clusters,5);
  console.log(`Histology/gross | gangrene crypt calls ${gangrene.crypts} | chronic cross-section Ø${cross.diameter}px`);
  for(const {audit:stage} of audit.images){
    assert.equal(stage.multiplier,2.4);
    assert.equal(stage.sameSource,true);
    assert.ok(stage.noise.samples>100_000);
    assert.ok(stage.noise.sigma>=5.3&&stage.noise.sigma<=5.7);
    assert.ok(stage.noise.effectiveSigma>=5.25&&stage.noise.effectiveSigma<=5.75);
  }
  const inflammatory=audit.images[1].audit.stranding;
  assert.equal(inflammatory.octaves,3);
  assert.ok(inflammatory.voxels>1000);
  assert.ok(inflammatory.oppositeDelta>.04,'Fat field must differ across opposite sectors');
  assert.ok(inflammatory.strands>=14&&inflammatory.strands<=18);
  assert.equal(inflammatory.radialPaths,0);
  assert.equal(audit.images[2].audit.gasBubbles,4);
  console.log(`CT | applied noise σ ${audit.images.map(({audit})=>audit.noise.effectiveSigma.toFixed(2)).join('/')} | fBm ${inflammatory.octaves} octaves | antipodal Δα ${inflammatory.oppositeDelta.toFixed(3)} | ${inflammatory.strands} broken strands | ${inflammatory.radialPaths} paths originating at centre`);
}

let browser;
try {
  try {
    browser = await chromium.launch({ headless: true, executablePath, args });
  } catch (error) {
    if (executablePath || !String(error).includes("Executable doesn't exist")) throw error;
    browser = await chromium.launch({ headless: true, channel: 'chrome', args });
  }
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, locale });
  const failures = [];
  page.on('pageerror', e => { failures.push(e.message); console.error(e.message); });
  page.on('console', line => {
    if (line.type() === 'error') { failures.push(line.text()); console.error(line.text()); }
  });
  await page.route('**/*', route => {
    const url=route.request().url();
    return url.startsWith(`${base}/`)||url.startsWith(`blob:${base}/`) ? route.continue() : route.abort();
  });
  await page.goto(base, { waitUntil: 'commit' });
  try {
    await page.waitForFunction(() => document.querySelector('main')?.dataset.ready === 'true', null, { timeout: 240_000 });
  } catch (error) {
    throw new Error(failures.join('\n') || error.message);
  }
  const {audit,surfaces,images}=await page.evaluate(()=>({
    audit:JSON.parse(document.querySelector('main').dataset.audit),
    surfaces:document.querySelectorAll('#assets foreignObject[data-drawn] canvas').length,
    images:document.querySelectorAll('image,img').length,
  }));
  assert.equal(images,0,'Expected live Canvas surfaces and no encoded or external image objects');
  assert.equal(surfaces,17);
  async function shot(time) {
    await page.evaluate(async t => {
      window.renderAt(t);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, time);
    return page.screenshot({ scale: 'css', timeout: 60_000 });
  }
  const png = await shot(1.6);
  const changed = await shot(3.8);
  const repeat = await shot(1.6);
  const pixels = await sharp(png).removeAlpha().raw().toBuffer();
  assert.ok(pixels.equals(await sharp(repeat).removeAlpha().raw().toBuffer()), 'Pixels change after a shuffled render');
  assert.ok(!pixels.equals(await sharp(changed).removeAlpha().raw().toBuffer()), 'Exudate responds to time');
  assert.deepEqual(failures, []);
  assertMedicalLooks(pixels,audit);
  const stable = await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
  const metadata = await sharp(stable).metadata();
  assert.deepEqual([metadata.width, metadata.height], [width, height]);
  assert.ok(!metadata.exif && !metadata.xmp && !metadata.iptc && !metadata.comments?.length);
  const out = path.join(here, 'out');
  await mkdir(out, { recursive: true });
  const result = path.join(out, 'assets_audit_v3.png');
  await writeFile(result, stable);
  console.log(`Chromium ${browser.version()} · ${width}×${height} · pixel MD5 ${createHash('md5').update(pixels).digest('hex')}`);
  console.log(result);
} finally {
  if (browser) await browser.close();
  server.close();
}
