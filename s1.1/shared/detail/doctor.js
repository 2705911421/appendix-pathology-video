import { cellDot, fillPath, ink, inkLines, organic, pigment, washLayer } from '../canvasCore.js';

const coat = 'M347 320 C323 328 294 329 272 348 C246 369 233 407 228 450 L219 562 C275 574 338 573 405 566 C465 574 530 573 580 561 L567 451 C560 405 549 373 525 351 C506 333 482 325 453 318 Q405 343 347 320Z';
const shirt = 'M345 325 Q374 351 397 353 C420 355 442 341 455 321 L481 371 L449 564 L362 565 L322 374Z';
const neck = 'M363 277 C367 298 359 313 343 325 Q369 359 397 363 Q433 361 455 323 C440 315 430 304 432 276Z';
const head = 'M324 179 Q331 149 363 145 C396 138 443 147 459 172 C470 192 471 221 461 250 C454 267 443 279 429 292 Q416 306 392 311 C370 310 352 302 338 282 C321 261 313 238 314 213 Q313 194 324 179Z';
const nearEar = 'M320 219 C306 204 297 218 301 233 Q305 252 324 252Z';
const farEar = 'M461 213 C479 204 485 217 480 233 Q477 245 461 250Z';
const hair = 'M321 231 C311 227 303 208 303 181 C303 148 316 128 339 116 C360 103 388 96 420 100 C442 100 457 111 468 123 C481 138 483 149 481 171 Q485 196 466 220 C466 191 464 178 451 164 C426 146 401 140 379 143 Q354 155 342 173 C331 188 321 206 321 231Z';
const lapelLeft = 'M347 320 C365 352 382 376 403 412 L415 456 Q369 415 330 395 L346 370 L320 358 Q329 336 347 320Z';
const lapelRight = 'M453 318 Q470 329 484 349 L460 370 L478 387 Q437 423 415 456 L403 412 C422 382 442 346 453 318Z';

const tubes = [
  'M353 333 C338 343 332 365 336 393 C338 418 345 430 353 443',
  'M445 331 C464 340 472 363 472 391 C472 421 455 450 469 474',
];
const binaural = [
  'M353 443 C342 435 327 427 323 412 Q318 399 325 392',
  'M353 443 C365 430 364 412 357 402 Q350 392 342 395',
];

function stethoscope() {
  return '<g data-stethoscope>'
    + inkLines(tubes, { size: 7.1, color: '#333C3F', taperStart: 2, taperEnd: 3 })
    + inkLines(['M348 342 C337 362 340 393 342 407', 'M450 338 Q467 354 467 381 C467 408 457 434 462 450'],
      { size: 1.85, color: '#849194', opacity: .74 })
    + cellDot(353, 442, 4.1, 4.2, '#30393C', -12)
    + inkLines(binaural, { size: 5.3, color: '#424B4F', taperStart: 1, taperEnd: 2 })
    + inkLines(['M350 439 C338 432 326 424 324 409 Q321 400 326 394',
      'M355 439 C363 427 361 413 355 404 Q350 395 343 396'],
      { size: 1.57, color: '#ACB8B9', opacity: .92, taperStart: 1, taperEnd: 2 })
    + cellDot(326.3, 392.3, 4.3, 2.7, '#343C3E', -22)
    + cellDot(342.3, 395.3, 4.18, 2.72, '#343C3E', 18)
    + ink('M468 472 L472 484', { size: 6.1, color: '#515D60', taperStart: 1, taperEnd: 2 })
    + cellDot(473, 492, 11.3, 10.1, '#414A4D', 13)
    + cellDot(472.3, 491.4, 8.7, 7.5, '#929E9F', 13)
    + cellDot(472.3, 491.9, 6.1, 5.2, '#D3DBD9', 13)
    + ink('M466 488 Q472 483 477 488', { size: 1.1, color: '#F5F7F5', opacity: .88 })
    + '</g>';
}

function doctorDrawing() {
  const bases = [
    [coat, '#FFFFFF'], [shirt, '#9CB3B4'], [neck, '#F0D0B5'],
    [nearEar, '#EBC5AD'], [farEar, '#EBC5AD'], [head, '#F5DBC1'], [hair, '#63615D'],
  ].map(([path, color]) => fillPath(path, color)).join('');
  const paint = washLayer(71981, () => {
    const soft = { bleed: .12, direction: 'in', border: .40, texture: .74 };
    pigment('M220 560 Q234 401 275 361 C271 435 289 500 275 565Z', '#9EA9AE', 53, soft);
    pigment('M528 369 Q559 412 575 558 Q551 569 520 566 C534 498 516 432 528 369Z', '#A3A9AF', 57, soft);
    pigment('M336 400 Q384 423 412 463 L412 569 Q388 568 379 555 C386 507 374 464 336 400Z',
      '#B9C0C4', 30, { ...soft, bleed: .19 });
    pigment(shirt, '#63858B', 86, soft);
    pigment('M363 286 Q385 320 431 292 Q436 310 450 324 Q431 341 399 343 Q375 342 350 326 Q363 313 363 286Z',
      '#B97962', 74, soft);
    pigment(head, '#CB936F', 54, { ...soft, bleed: .11 });
    pigment('M318 221 Q329 256 350 271 Q370 294 394 303 Q371 307 351 293 Q328 279 319 253Z',
      '#B67D65', 53, { ...soft, bleed: .14 });
    pigment(organic(339, 246, 15.4, 10.6, 181, .23, .30), '#C98276', 70, { bleed: .24, border: .31 });
    pigment(organic(439, 244, 18.7, 10.9, 277, .24, -.24), '#C37D72', 44, { bleed: .33, border: .24 });
    pigment(hair, '#393B3A', 137, { ...soft, texture: .89 });
    pigment('M310 185 C315 145 339 118 363 114 Q348 137 334 160 C328 171 320 189 319 209Z',
      '#B9B3A8', 145, { ...soft, bleed: .15, border: .31 });
    pigment('M423 111 C451 114 477 136 477 163 Q477 185 469 192 Q466 164 453 151 Q442 132 423 111Z',
      '#AEB1AE', 107, { ...soft, bleed: .15, border: .32 });
  }, 'multiply', [207, 87, 390, 496]);
  const lapels = `<g data-doctor-lapels>${fillPath(lapelLeft, '#FFFFFF')}${fillPath(lapelRight, '#FFFFFF')}
    ${fillPath('M336 392 Q378 419 409 450 Q379 425 341 389Z', '#E9EEF0', .71)}
    ${fillPath('M468 389 Q450 414 419 450 Q447 411 462 390Z', '#EEF2F3', .76)}
  </g>`;

  const contours = inkLines([
    coat, 'M314 219 Q319 251 338 282 C355 305 375 315 393 310 Q412 306 429 293 Q454 273 462 247',
    'M322 247 Q309 247 304 234 Q299 219 310 222', 'M462 245 Q475 241 476 227 Q476 216 466 219',
    'M320 229 Q303 213 303 182 C303 150 316 128 339 116 Q380 94 420 100',
    'M420 100 C446 103 463 114 473 132 Q489 163 471 208',
    'M362 303 Q359 315 347 323', 'M432 298 Q436 312 454 323',
  ], { size: 2.75, color: '#5D4B42', opacity: .89 });
  const fabric = inkLines([
    'M347 320 C365 353 383 383 404 415 L415 456 Q372 421 331 395 L346 370 L320 358 Q330 336 347 320',
    'M453 318 Q473 328 484 349 L460 371 L478 388 Q441 416 415 456 L418 562',
    'M356 328 Q382 364 398 354 Q425 352 447 331',
    'M275 378 Q287 426 278 460 Q272 509 283 563', 'M524 376 Q511 412 520 464 Q527 511 519 558',
    'M484 465 Q505 467 528 462 L524 495 Q509 501 489 499 L484 465',
    'M239 530 Q253 524 271 530', 'M534 512 Q549 506 561 511',
  ], { size: 2.2, color: '#747B7D', opacity: .77 });
  const hairTexture = inkLines([
    'M310 186 Q318 148 345 135 Q366 122 385 123',
    'M310 202 Q322 164 340 151 Q360 137 377 137',
    'M315 213 Q322 189 333 176',
    'M343 130 C373 108 412 106 437 119',
    'M354 136 C386 118 422 117 449 134',
    'M370 139 C399 131 424 133 447 147',
    'M449 135 Q470 154 474 189', 'M456 149 Q466 168 469 184',
  ], { size: 2.2, color: '#B4AEA3', opacity: .73 });
  const features = inkLines([
    'M333 203 Q348 195 368 202', 'M416 198 Q433 193 449 200',
    'M335 221 Q348 213 365 219', 'M419 218 Q432 210 448 217',
    'M381 221 Q382 234 375 244 Q378 251 392 247',
    'M367 265 C380 274 399 277 419 264',
    'M382 281 Q394 285 405 279',
  ], { size: 2.75, color: '#574038', taperStart: 2, taperEnd: 5 });
  const expression = inkLines([
    'M330 224 Q335 229 342 229', 'M447 220 Q451 224 456 223',
    'M352 243 Q351 252 357 257', 'M424 244 Q427 250 424 257',
  ], { size: 1.65, color: '#A16E60', opacity: .6 });
  return bases + paint + lapels + contours + fabric + hairTexture + features + expression
    + cellDot(347.5, 220, 3, 3.8, '#48382F', 10) + cellDot(431.5, 216, 2.9, 3.7, '#48382F', 8)
    + cellDot(347, 218.6, 1, 1.12, '#F9E2CE') + cellDot(431.1, 214.7, 1, 1.04, '#F9E2CE')
    + cellDot(423, 492, 1.9, 2.55, '#8E9290') + cellDot(423, 531, 1.9, 2.55, '#8E9290')
    + stethoscope();
}

let portrait;
export function drawDoctor({ x = 400, y = 99, scale = 1 } = {}) {
  if (![x, y, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid doctor position or scale');
  return `<g transform="translate(${x} ${y}) scale(${scale}) translate(-400 -99)">${portrait ??= doctorDrawing()}</g>`;
}
