import {INK, arrow, box, ellipse, glow, label, layer, line, mix, prng, roughShape, shape, wash} from './art.js';

const skin = '#F1C8AF';
const shade = '#C28369';
const hair = '#373439';
const stroke = '#2A2A2A';

function head(g, dx, dy, face, doctor = false, scale = 1, tilt = 0) {
  g.save(); g.translate(dx, dy); g.rotate(tilt); g.scale(scale, scale);
  shape(g, 'M-25 120L-27 159 Q0 178 27 159L23 120Z', shade, stroke, 2.2);
  shape(g, 'M-53 69 C-74 52 -72 94 -58 97 Q-50 101 -48 88 M53 69 C74 52 72 96 57 97 Q50 102 48 87', skin, stroke, 2.4);
  shape(g, 'M-59 76 q-8 -12 -7 2 m129 -2 q7 -12 7 3', null, shade, 1.6);
  const outline = 'M0 0 C-38 -1 -57 24 -56 58 C-55 91 -42 124 -19 135 Q-5 145 12 137 C38 126 56 97 55 60 C58 22 34 0 0 0Z';
  const gradient = g.createLinearGradient(-60, 8, 54, 109);
  gradient.addColorStop(0, '#FCE2CB'); gradient.addColorStop(.66, skin); gradient.addColorStop(1, '#D6977F');
  shape(g, outline, gradient, stroke, 2.5);
  g.save(); g.clip(new Path2D(outline));
  wash(g, 'pink', 34, 106, 135, .17);
  const cap = 'M-62 66 Q-62 17 -41 3 C-15 -13 29 -9 49 9 Q65 21 61 67 L52 65 L44 38 C22 39 3 27 -7 24 Q-21 40 -48 44 L-52 70Z';
  shape(g, cap, hair, '#252127', 2.5);
  g.save(); g.clip(new Path2D(cap));
  const rand = prng(659);
  for (let i = 0; i < 65; i++) {
    const x = -59 + i * 1.85;
    const y = -11 + rand() * 15;
    shape(g, `M${x} ${y}q${6 + rand()*7} 19 4 ${33 + rand()*20}`, null,
      i % 3 ? '#6C5F5A' : '#A79A8F', .8);
  }
  g.restore(); g.restore();
  shape(g, 'M3 66 q-3 19 -8 23 q7 5 13 1', null, '#955E54', 1.9);
  if (face === 'pain') {
    shape(g, 'M-39 57 Q-24 53 -11 65 M11 65 Q26 53 40 57', null, hair, 3.6);
    shape(g, 'M-35 73 L-19 81 L-35 86 M35 73 L19 81 L35 86 M-17 115 Q0 100 17 115', null, '#4F3337', 3);
  } else if (face === 'smile') {
    shape(g, 'M-39 61 Q-27 54 -15 60 M15 59 Q27 51 39 57 M-36 79 Q-26 68 -16 77 M16 76 Q26 66 36 75', null, hair, 2.5);
    shape(g, 'M-17 105 Q0 113 22 101 Q12 123 0 121 Q-9 118 -17 105Z', '#8B514E', '#613847', 2);
    shape(g, 'M-15 106 Q2 112 19 103 Q14 113 1 114 Q-7 113 -15 106Z', '#FFF1E4');
  } else {
    shape(g, 'M-39 59 Q-28 52 -16 59 M16 59 Q29 52 39 59 M-34 75 Q-25 70 -16 74 M16 74 Q26 70 34 75 M-14 108 Q0 112 14 107', null, hair, 2.5);
    ellipse(g, -25, 76, 2.9, 4, hair); ellipse(g, 25, 76, 2.9, 4, hair);
  }
  if (doctor) {
    ellipse(g, -25, 76, 22, 17, null, '#24252D', 2.9);
    ellipse(g, 25, 76, 22, 17, null, '#24252D', 2.9);
    shape(g, 'M-4 74 Q0 69 4 74 M-46 73 L-60 68 M46 73 L59 68', null, '#24252D', 2.8);
  }
  g.restore();
}

export const FIGURE = {navel: [216, 283], hip: [158, 353], point: [177.3, 329.7]};

function leanPatient(g) {
  g.translate(210, 348);
  g.rotate(-.115);
  g.translate(-210, -348);
}

function contour(g, path, light, dark, y0, y1, outline = '#55404A') {
  const shade = g.createLinearGradient(110, y0, 326, y1);
  shade.addColorStop(0, light); shade.addColorStop(1, dark);
  return shape(g, path, shade, outline, 2.3);
}

function patient(g, pose, anatomy) {
  const pressing = pose === 'pain';
  const trousers = pressing
    ? 'M144 345 Q212 334 281 347 C296 401 293 463 289 509 L306 653 Q289 669 253 659 L225 515 L215 453 C198 493 177 521 173 558 L164 664 Q143 674 113 665 L112 568 Q112 531 128 480Z'
    : 'M140 344 Q216 338 281 348 C292 390 291 451 288 514 L292 661 Q273 675 240 662 L219 525 L213 446 L189 526 L172 667 Q149 675 121 666 L120 541Z';
  contour(g, trousers, '#71818B', '#364650', 361, 632);
  shape(g, 'M151 362 Q166 391 165 408 M266 364 Q247 383 242 410 M212 367 Q207 401 212 441 M142 508 Q156 515 169 510 M249 532 Q267 540 278 529 M137 645 l22 5 M258 646 l22 -2', null, '#A4ACAD', 2);
  for (const [x, y, mirror] of [[141,664,-1],[pressing ? 279 : 267,662,1]]) {
    g.save(); g.translate(x,y); g.scale(mirror,1);
    contour(g, 'M-24 -11 Q-7 -3 24 -11 C27 4 42 9 49 18 Q52 30 39 34 L-26 34 Q-35 31 -32 21Z',
      '#E8DDD5', '#A0A0A1', -10, 24);
    shape(g, 'M-31 24 Q9 27 48 23 L48 31 Q18 37 -27 34Z', '#FAF3E9', '#706566', 1.4);
    shape(g, 'M5 4 l17 0 m-12 7 l17 0 m-12 7 l17 0', null, '#FCF8F0', 2.2);
    g.restore();
  }
  g.save();
  if (pressing) leanPatient(g);
  const loose = 'M266 162 L295 172 Q318 214 317 253 L319 318 Q325 332 315 351 Q309 356 307 347 Q298 360 295 349 L293 331 Q283 333 287 317 L284 257 Q269 222 264 197Z';
  const hanging = 'M132 160 L158 171 Q150 216 141 245 L126 305 Q128 322 116 338 Q111 345 108 333 Q101 344 98 336 L98 319 Q91 323 92 310 L105 242 Q109 192 132 160Z';
  const pressingArm = 'M132 158 L158 168 Q154 210 144 243 Q139 257 159 268 L193 287 Q207 285 219 296 L225 304 Q224 311 214 306 L208 304 Q214 316 202 315 Q192 313 185 308 C162 302 133 298 119 283 Q102 266 110 231Z';
  contour(g, loose, '#FCE0C6', '#C88E76', 172, 333);
  contour(g, pressing ? pressingArm : hanging, '#F9DCC2', '#C88E76', 172, 336);
  head(g, pressing ? 195 : 211, pressing ? 42 : 29, pose, false, .70, pressing ? -.13 : .025);
  const shirt = pressing
    ? 'M179 143 Q200 161 224 145 L260 145 Q286 150 302 174 L310 190 Q292 204 273 201 L266 183 Q257 240 276 290 L290 359 Q246 371 141 350 L155 293 Q156 243 141 196 Q130 198 113 187 L128 161 Q147 143 179 143Z'
    : 'M188 131 Q212 149 236 130 L272 140 Q298 147 311 188 Q296 201 277 197 L272 182 Q259 238 273 286 L281 351 Q211 366 139 349 L147 288 Q153 247 145 192 L136 200 Q119 197 108 183 L123 153 Q144 137 188 131Z';
  g.save(); g.clip(contour(g, shirt, '#FFFAEE', '#D0DEDD', 156, 353));
  wash(g, 'lilac', 272, 270, 302, .12);
  shape(g, 'M151 213 Q164 251 163 279 Q183 257 208 276 M145 335 Q179 318 202 336 T275 339 M257 198 Q245 212 243 233 M179 143 Q212 171 238 142', null, '#819CA39A', 1.9);
  shape(g, 'M155 287 Q181 270 213 287 Q176 281 155 303Z M235 330 Q264 314 275 308 L278 337Z', '#839EA230');
  g.restore();
  if (anatomy) {
    g.save(); g.globalAlpha = .74;
    const window = box(g, 152, 250, 119, 111, 23, '#F3DAD27A', '#A47175', 1.2);
    g.clip(window);
    organs(g, 103, 253, .35, false);
    line(g, [FIGURE.navel, FIGURE.hip], '#653C52', 1.7, [7, 6]);
    ellipse(g, ...FIGURE.navel, 3, 3, '#653C52');
    ellipse(g, ...FIGURE.hip, 3, 3, '#653C52');
    g.restore();
  }
  if (pressing) {
    const front = 'M119 256 Q136 251 155 266 L193 287 Q207 285 219 296 L225 304 Q224 311 214 306 L208 304 Q214 316 202 315 Q192 313 185 308 C162 302 133 298 119 283';
    contour(g, `${front} Q112 270 119 256Z`, '#FCE0C2', '#D69E89', 256, 315);
    shape(g, 'M193 296 Q201 297 208 304 M134 276 q7 6 21 10', null, '#9D6D68', 1.6);
  }
  g.restore();
}

function physician(g, gesture) {
  const angled = gesture === 'imaging';
  const timing = gesture === 'timing';
  g.save();
  if (angled) { g.translate(23, 0); g.transform(.92, -.02, .10, 1, 0, 0); }
  head(g, angled ? 226 : 208, 24, 'calm', true, .87, angled ? .12 : timing ? .06 : -.035);
  const near = gesture === 'consult'
    ? 'L318 296 Q306 339 255 362 L239 328 L286 286 L278 242'
    : angled ? 'L321 260 L391 209 L410 234 Q383 287 310 315 L280 298'
      : timing ? 'L320 266 Q341 261 350 227 L379 234 Q371 290 337 316 Q312 336 282 305'
        : 'L310 281 L369 260 L385 284 Q362 332 307 334 L280 307';
  const coat = `M183 145 Q207 174 236 143 L270 156 Q302 164 313 194 ${near} Q273 376 300 509 Q229 532 122 511 Q141 448 132 348 L95 372 Q71 365 66 346 Q89 318 97 252 L109 195 Q121 160 183 145Z`;
  g.save(); g.clip(contour(g, coat, '#FFFAF0', '#D0E0E1', 154, 519));
  wash(g, 'lilac', 130, 396, 320, .15);
  shape(g, 'M181 148 L206 198 L234 148 L249 211 L207 282 L167 212Z', '#8EA4A8');
  shape(g, 'M181 147 L143 171 L160 202 L151 216 L203 295 L180 199Z M237 147 L269 174 L254 202 L267 218 L207 296 L232 200Z',
    '#FBF6ED', '#8B8A88', 1.8);
  shape(g, 'M207 294 L214 514 M225 314 L264 313 L261 355 L224 356Z M143 422 Q168 411 178 415 M237 425 Q264 420 279 432 M113 288 L127 309 M145 374 Q166 385 169 400', null, '#7E969A', 2.2);
  shape(g, 'M238 315 L242 285 L249 287 L245 315Z', '#A95159', '#765458', 1.2);
  g.restore();
  shape(g, 'M166 171 C128 182 137 260 158 272 C178 282 197 254 186 231 M235 170 C264 181 273 229 259 242 C240 258 219 233 225 218', null, '#465660', 4);
  ellipse(g, 159, 276, 10, 11, '#C4D5D7', '#52636D', 2.6);
  if (gesture === 'consult') {
    shape(g, 'M97 344 L118 335 Q133 346 150 353 L154 371 Q137 381 117 374 L96 365Z', skin, '#875E58', 1.9);
    g.save(); g.translate(187,333); g.rotate(-.17);
    box(g, -47, -38, 129, 160, 9, '#677A7A', '#43585C', 2.6);
    box(g, -38, -30, 112, 139, 4, '#F7ECD8');
    box(g, -14, -46, 62, 18, 5, '#A9B3AB');
    for (let y = 1; y <= 80; y += 19) line(g, [[-25,y],[59,y]], '#A8A09B', 1.7);
    g.restore();
    shape(g, 'M265 333 Q253 323 243 332 L222 351 Q219 357 226 359 L238 354 Q225 369 234 373 L256 369 L270 357Z', skin, '#875E58', 2);
  } else {
    const hand = angled
      ? 'M391 211 L407 194 Q417 186 431 183 L455 174 Q467 173 466 179 Q465 185 442 194 L429 200 Q439 205 433 212 L418 225 L408 232Z'
      : timing ? 'M350 231 L348 214 Q337 203 340 193 Q343 188 350 196 L358 205 L360 166 Q364 158 370 166 L371 200 L381 182 Q386 177 391 183 L388 200 Q399 196 399 203 Q395 218 379 237Z'
        : 'M366 263 Q381 242 394 238 L419 230 Q425 232 417 240 L408 246 L431 242 Q438 243 432 250 L412 260 L431 254 Q440 257 434 262 L412 272 Q398 286 383 284Z';
    contour(g, hand, '#FBE0C8', '#D5A086', 190, 285, '#875E58');
    contour(g, 'M68 347 L94 356 L90 380 Q88 393 80 393 L76 386 Q65 395 63 383 L62 371Z',
      '#FBE0C8', '#D5A086', 341, 394, '#875E58');
  }
  g.restore();
}

function recovery(g) {
  head(g, 219, 42, 'smile', false, 1.15, -.085);
  const torso = 'M185 216 Q212 245 253 212 Q287 220 316 244 Q333 265 332 300 L290 314 L284 291 Q303 372 303 501 Q202 533 112 500 L124 397 L122 305 L106 308 L72 283 Q91 231 185 216Z';
  g.save(); g.clip(contour(g, torso, '#FFF7ED', '#C6DAD9', 230, 484));
  wash(g, 'lilac', 245, 429, 366, .15);
  shape(g, 'M183 214 Q216 252 254 212 M126 326 Q149 358 147 381 M124 488 Q228 468 295 489', null, '#89A4A8', 2.5);
  g.restore();
  contour(g, 'M79 286 L117 307 Q116 360 95 395 L83 415 Q89 423 83 432 L77 441 Q73 446 69 441 Q64 451 60 444 Q53 446 55 438 L57 429 Q55 421 64 407 L80 354 Q77 328 79 286Z',
    '#FBE0C8', '#D5A086', 289, 448, '#875E58');
  shape(g, 'M67 411 Q74 414 80 419 M70 434 L67 442', null, '#B57A70', 1.4);
  contour(g, 'M301 303 L330 291 Q358 318 367 280 L374 249 L400 251 Q399 323 372 352 Q347 383 322 354 L296 328Z',
    '#FBE0C8', '#D5A086', 263, 353, '#875E58');
}

export function waveHand(g, elapsed) {
  g.save(); g.translate(385, 252);
  g.rotate(.09 * Math.sin(elapsed * 5.6) + .36 * Math.sin(elapsed * 2.5) ** 3);
  contour(g, 'M-11 4 L-12 -20 Q-24 -32 -24 -42 Q-23 -49 -17 -45 L-7 -34 L-7 -65 Q-5 -77 0 -74 L6 -51 L7 -80 Q9 -87 14 -84 L17 -51 L20 -76 Q27 -86 31 -77 L31 -46 L36 -64 Q45 -70 45 -61 L40 -31 Q38 -12 24 -2 L14 6Z',
    '#FBE0C8', '#DBA995', -75, 2, '#875E58');
  shape(g, 'M-4 -32 Q8 -41 20 -35 M2 -18 Q14 -24 23 -21', null, '#C18B7C', 2);
  g.restore();
}

export function organs(g, x, y, scale, annotations = true) {
  g.save(); g.translate(x, y); g.scale(scale, scale);
  shape(g, 'M215 28 Q256 26 273 61 L283 148 Q293 202 265 216 Q227 241 183 209 Q153 188 159 155 L160 92 Q165 40 215 28Z', '#E8A898', '#703E46', 4);
  shape(g, 'M407 147 C349 123 322 116 273 136 C251 152 216 157 193 144 L189 174 Q218 201 280 173 Q341 143 402 180Z', '#F4BDAC', '#824A50', 4);
  shape(g, 'M215 193 C190 221 194 243 210 258 Q230 275 211 295 Q199 307 187 304 Q166 300 180 285 Q202 264 185 248 Q162 220 181 195Z', '#BB4446', '#63313B', 3.6);
  for (const k of [0, 1, 2]) shape(g, `M${166 + k * 3} ${76 + k * 39}q33 24 51 15`, null, '#BB796F', 2.5);
  shape(g, 'M221 42 Q251 55 255 130 Q272 178 250 201', null, '#F8DED0', 5);
  shape(g, 'M196 207 Q182 235 199 250 Q214 271 193 294', null, '#EB9690', 2.5);
  if (annotations) {
    line(g, [[133, 66],[160,66],[185,93]], '#8E5A57', 1.7);
    label(g, '盲肠', 61, 75, 32);
    line(g, [[309, 94],[349,94],[366,138]], '#8E5A57', 1.7);
    label(g, '回肠末端', 289, 89, 32);
    line(g, [[119, 278],[162,278],[182,284]], '#8E5A57', 1.7);
    label(g, '阑尾', 47, 289, 32);
  }
  g.restore();
}

export function figureAssets() {
  return {
    pain: layer(425, 734, g => patient(g, 'pain', true)),
    recovery: layer(480, 565, recovery),
    calm: layer(425, 734, g => patient(g, 'calm', false)),
    doctor: Object.fromEntries(['consult','imaging','gesture','timing'].map(pose => [pose, layer(490, 545, g => physician(g, pose))])),
  };
}

export function painMark(g, x, y, pulse, focused) {
  glow(g, x, y, focused ? 47 + 7 * pulse : 66 + 12 * pulse, '#D93829', .62);
  if (focused) {
    ellipse(g, x, y, 16, 16, '#FFE6D969', '#B33432', 2.5);
    line(g, [[x - 24,y],[x + 24,y]], '#AD2D2A', 3);
    line(g, [[x,y - 24],[x,y + 24]], '#AD2D2A', 3);
  }
}

export function migration(g, x, y, k, pulse, poseScale) {
  g.save();
  leanPatient(g);
  const [nx, ny] = FIGURE.navel, [mx, my] = FIGURE.point;
  const xx = x + mix(nx, mx, k) * poseScale;
  const yy = y + (mix(ny, my, k) - 16 * Math.sin(k * Math.PI)) * poseScale;
  if (k > .06) {
    shape(g, `M${x+nx*poseScale} ${y+ny*poseScale} Q${x+(nx-61)*poseScale} ${y+(ny-20)*poseScale} ${xx} ${yy}`, null, '#B33733BB', 3);
    if (k > .4) arrow(g, xx + 21 * poseScale, yy - 14 * poseScale, xx, yy, '#B33733', 2.6);
  }
  painMark(g, xx, yy, pulse, k >= .98);
  g.restore();
}
