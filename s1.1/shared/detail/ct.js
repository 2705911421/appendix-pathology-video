import { cellDot, fillPath, mulberry32, organic, scopeSvg, strokePath, svgId } from './geometry.js';

export const CT = Object.freeze({ x: 1172, y: 242, width: 642, height: 478 });
// Axial viewing convention: anterior is up. Local x increases from patient right to left.
const skin = 'M27 230 C25 171 74 119 135 88 C177 66 218 60 261 58 C288 54 310 50 339 52 C381 54 430 58 474 71 C538 86 603 137 617 191 C637 257 609 324 547 367 C501 398 468 420 415 424 C384 427 358 420 332 418 C306 419 275 430 242 429 C181 428 144 403 99 379 C54 353 29 295 27 230Z';
const peritoneum = 'M91 190 C104 158 142 126 185 113 C232 99 269 102 300 102 C348 99 380 103 416 114 C470 116 531 130 558 172 C575 205 567 246 534 276 C510 312 457 329 406 331 L350 317 C313 308 265 325 239 332 C201 337 148 317 121 287 C98 263 76 225 91 190Z';
const psoas = 'M207 266 C229 251 256 255 270 280 C284 306 282 337 265 362 C251 378 219 365 207 347 C193 327 188 289 207 266Z';
const iliacus = 'M93 227 C100 214 116 210 123 224 C146 253 176 267 195 286 C207 305 204 331 195 340 C184 341 175 320 163 302 C147 278 104 267 93 250Z';
const iliacBone = 'M91 240 C99 239 106 246 110 256 C126 277 147 286 161 301 C188 326 194 350 221 372 C232 380 242 389 243 401 C230 403 207 393 191 379 C163 357 153 332 134 318 C122 308 113 302 105 288 C95 275 82 249 91 240Z';
const iliacMarrow = 'M96 247 C101 248 103 256 106 262 C119 281 143 290 155 306 C182 332 189 355 212 374 Q227 385 232 395 C219 395 200 382 189 372 C165 350 158 330 141 316 C127 303 115 295 109 281 C104 272 90 254 96 247Z';
const vertebra = 'M282 317 C295 307 310 302 327 305 C345 301 363 306 375 317 C388 331 385 348 373 361 C361 374 339 376 324 371 C307 376 288 368 279 355 C272 344 274 327 282 317Z';
const marrow = 'M286 323 C297 315 313 312 326 315 C342 311 361 313 371 325 C380 337 374 350 367 356 C357 363 340 367 323 362 C310 368 293 361 286 351 C279 343 281 330 286 323Z';
const mirror = (art) => art + `<g transform="translate(654 0) scale(-1 1)">${art}</g>`;

function bowel() {
  const loops = [
    [148, 152, 33, 28, 0.37], [185, 122, 32, 19, -0.27], [215, 168, 39, 25, 0.65],
    [267, 140, 36, 29, -0.46], [321, 142, 24, 35, -0.64], [380, 139, 34, 23, 0.65],
    [425, 153, 26, 20, -0.3], [470, 139, 32, 17, 0.34], [516, 169, 29, 41, -0.48],
    [478, 194, 27, 23, 0.78], [405, 199, 47, 29, -0.29], [350, 188, 37, 22, 0.42],
    [305, 225, 42, 28, -0.37], [251, 207, 30, 23, 0.29], [217, 236, 30, 23, -0.40],
    [147, 199, 44, 38, -0.42], [353, 248, 34, 19, 0.29], [423, 248, 28, 20, 0.89],
    [493, 232, 26, 29, -0.58], [458, 269, 31, 23, -0.62], [386, 276, 21, 16, 0.42],
  ];
  return loops.map(([x, y, rx, ry, angle], i) => {
    const seed = 83 + 511 * i;
    const outer = organic(x, y, rx, ry, seed, 0.43, angle, 15);
    const gas = i === 15 || i % 4 === 0;
    const chyme = organic(x - 2, y + 1, rx * .82, ry * .72, seed, 0.45, angle, 15);
    const pockets = organic(x + rx * .1, y - ry * .18, rx * (gas ? .58 : .35), ry * .43, seed + 34, .54, angle, 13);
    const fold = [0, 1, 2].map(j => {
      const left = (x - rx * .48) + j * rx * .23;
      return strokePath(`M${left} ${y - ry * .56} Q${left + 5} ${y - 4} ${left - 3} ${y + ry * .34}`,
        gas ? '#515151' : '#6C6C6D', 1.18, 0.62);
    }).join('');
    return fillPath(outer, i % 3 ? '#7E7E7F' : '#919190', .95)
      + strokePath(outer, '#AAA9A7', 1.1, .33)
      + fillPath(chyme, gas ? '#505052' : '#656565')
      + fillPath(pockets, gas ? '#131416' : '#363637', .94)
      + fold;
  }).join('');
}

function bone() {
  const wings = mirror(fillPath(iliacBone, '#EBECEB')
    + strokePath(iliacBone, '#F4F4F0', 1.7, .81)
    + fillPath(iliacMarrow, '#A8A7A7', .92));
  const posterior = mirror(fillPath(
    'M278 351 C281 348 289 353 293 360 L305 374 Q311 379 309 386 L304 398 Q288 403 288 391 Q283 383 271 377 C260 370 262 358 278 351Z', '#E4E4E3')
    + fillPath('M277 358 Q288 358 294 370 L301 383 L298 391 Q291 381 282 377 Q269 366 277 358Z', '#A3A1A1'));
  const spinous = fillPath('M320 371 Q326 366 334 371 Q336 382 346 391 C349 404 337 419 331 421 Q324 423 319 415 C314 408 306 398 309 391 Q317 385 320 371Z', '#E9E8E7')
    + fillPath('M324 389 Q330 382 336 395 Q338 402 330 412 Q326 411 320 402Z', '#B0ADAD');
  const rand = mulberry32(642);
  const trabeculae = [];
  for (let i = 0; i < 340; i++) {
    const x = 82 + rand() * 490;
    const y = 245 + rand() * 150;
    trabeculae.push(cellDot(x, y, 0.58 + rand() * 3.8, .55 + rand() * 1.35,
      i % 3 ? '#D1CECB' : '#807A79', -72 + rand() * 150, .25 + rand() * .58));
  }
  return wings + posterior + spinous + fillPath(vertebra, '#F5F5F2')
    + fillPath(marrow, '#B4B0AE') + strokePath(vertebra, '#FFFFFF', 2.6, .93)
    + `<g clip-path="url(#ct-marrow)">${trabeculae.join('')}</g>`;
}

function axialCT(lesion, x = CT.x, y = CT.y) {
  const limbMuscle = mirror(fillPath(psoas, 'url(#ct-muscle)')
    + strokePath(psoas, '#A8A4A1', 1.45, .33)
    + fillPath(iliacus, '#636062')
    + fillPath('M61 242 C74 230 82 258 93 278 C117 316 153 336 166 357 C168 369 159 381 141 376 C111 361 90 347 76 326 Q51 296 61 242Z', 'url(#ct-muscle)', .95)
    + fillPath('M157 342 C181 343 197 371 227 388 C242 393 270 389 282 397 C283 407 260 415 234 417 C204 418 179 407 158 392 C143 379 143 359 157 342Z', '#777477', .82));
  const fascia = mirror(fillPath('M41 219 C45 171 82 127 131 105 C167 91 203 80 227 81 C242 83 235 96 225 100 C175 119 129 125 105 164 C92 192 92 212 81 235 C67 253 52 245 41 219Z', '#777676', .71)
    + fillPath('M199 91 C221 74 253 72 282 70 C302 70 323 78 321 88 C309 98 280 93 252 98 Q214 108 199 91Z', '#878485', .93)
    + strokePath('M51 213 C68 159 132 119 193 109 C237 97 274 93 312 94', '#B1ADA9', 1.4, .55));
  const rand = mulberry32(20013);
  const texture = [];
  for (let i = 0; i < 860; i++) {
    const x = 28 + rand() * 600;
    const y = 53 + rand() * 368;
    texture.push(cellDot(x, y, 0.65 + rand() * 2.6, .55 + rand() * 2.1,
      i % 4 ? '#9C9997' : '#252526', rand() * 180, .04 + rand() * .16));
  }
  const vessels = [
    'M324 290 C307 260 286 253 267 251 Q232 241 220 215',
    'M327 293 C342 263 366 254 389 242 Q418 231 425 213',
    'M309 286 Q278 269 266 229', 'M348 281 Q379 261 404 266 Q431 262 447 237',
    'M272 251 Q246 252 229 266', 'M364 258 Q344 245 352 213',
  ].map(d => strokePath(d, '#92908E', 2.5, .57)).join('');
  const appendix = 'M148 218 C154 222 160 225 164 233 C169 242 177 246 184 245 Q191 244 194 241';
  const appendixArt = lesion ?? (strokePath(appendix, '#BFBDBC', 12, .96)
    + strokePath(appendix, '#807D7E', 4.2, .9)
    + cellDot(192, 242, 3.1, 2.45, '#A09D99', -15));
  return `<g transform="translate(${x} ${y})">
    <defs>
      <linearGradient id="ct-film" x2="0" y2="1"><stop stop-color="#17181A"/><stop offset="1" stop-color="#101011"/></linearGradient>
      <linearGradient id="ct-fat" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#4A494A"/><stop offset=".57" stop-color="#313133"/><stop offset="1" stop-color="#484546"/></linearGradient>
      <linearGradient id="ct-muscle" x1="0" y1="0" x2=".9" y2=".8"><stop stop-color="#777476"/><stop offset=".45" stop-color="#888684"/><stop offset="1" stop-color="#555456"/></linearGradient>
      <clipPath id="ct-body"><path d="${skin}"/></clipPath>
      <clipPath id="ct-plate"><rect x="0" y="0" width="${CT.width}" height="${CT.height}"/></clipPath>
      <clipPath id="ct-marrow"><path d="${marrow}"/><path d="${iliacMarrow}"/><path d="${iliacMarrow}" transform="translate(654 0) scale(-1 1)"/></clipPath>
      <filter id="ct-soft"><feGaussianBlur stdDeviation="0.65"/></filter>
      <filter id="ct-emulsion" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".105 .16" numOctaves="4" seed="842" result="noise"/>
        <feColorMatrix in="noise" values=".4 .4 .45 0 -.08 .4 .4 .45 0 -.08 .4 .4 .45 0 -.08 0 0 0 0 .13"/>
        <feComposite in2="SourceGraphic" operator="in"/>
      </filter>
      <filter id="ct-density" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".019 .029" numOctaves="5" seed="103" result="noise"/>
        <feColorMatrix in="noise" values="1.05 .45 .50 0 -.48 1.05 .45 .50 0 -.48 1.05 .45 .50 0 -.48 0 0 0 0 .27"/>
        <feComposite in2="SourceGraphic" operator="in"/>
      </filter>
    </defs>
    <rect width="${CT.width}" height="${CT.height}" fill="url(#ct-film)"/>
    <g clip-path="url(#ct-plate)">
      ${strokePath('M66 443 C206 471 434 470 572 442', '#7A7877', 1.5, .43)}
      <g filter="url(#ct-soft)">
        ${fillPath(skin, 'url(#ct-fat)')}${strokePath(skin, '#B1ADA9', 3, .78)}
        ${fascia}
        ${fillPath(peritoneum, '#3D3C3E')}${strokePath(peritoneum, '#A5A1A0', 1.75, .42)}
        ${limbMuscle}
        ${bone()}
        ${vessels}
        ${cellDot(325, 289, 11, 9, '#B6B6B3', -8, .9)}
        ${cellDot(348, 294, 12, 7, '#A7A5A3', 18, .78)}
        ${bowel()}
        ${lesion === undefined ? appendixArt : ''}
        <g clip-path="url(#ct-body)">${texture.join('')}</g>
      </g>
      <g clip-path="url(#ct-body)"><rect width="${CT.width}" height="${CT.height}" fill="#777" filter="url(#ct-density)" style="mix-blend-mode:soft-light"/></g>
      ${lesion === undefined ? '' : appendixArt}
      <rect width="${CT.width}" height="${CT.height}" fill="#777" filter="url(#ct-emulsion)" style="mix-blend-mode:soft-light;opacity:.83"/>
    </g>
  </g>`;
}

export const axialFilm = lesion => axialCT(lesion, 0, 0);

let film;
export function drawAxialCT({ id, x = CT.x, y = CT.y, scale = 1, highlight = true } = {}) {
  id = svgId('axial-ct', id);
  if (![x, y, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid CT position or scale');
  const fit = markup => x === CT.x && y === CT.y && scale === 1 ? markup
    : `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-CT.x} ${-CT.y})">${markup}</g>`;
  const marker = highlight ? '<circle cx="1343" cy="478" r="24" fill="none" stroke="#E0463A" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="5 6"/>' : '';
  return {
    paint: fit(scopeSvg(film ??= axialCT(), id)),
    lettering: fit(`<text class="numeral ct-side" x="1202" y="287" fill="#FBF3E8" font-size="30">R</text>
      <text class="numeral ct-side" x="1785" y="287" fill="#FBF3E8" font-size="30" text-anchor="end">L</text>${marker}`),
    appendix: { x: x + 171 * scale, y: y + 236 * scale, radius: 24 * scale },
  };
}
