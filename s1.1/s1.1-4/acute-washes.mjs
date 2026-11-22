import { appendixRadius, appendixRibbon } from '../shared/anatomyWatercolor.js';
import { clamp, pigment, washLayer } from '../shared/canvasCore.js';

const tubeCrop = [105, 234, 348, 242];
const cover = u => appendixRadius(u, 104);

let softRed;
export function congestionWash() {
  return softRed ??= washLayer(62091, () => {
    pigment(appendixRibbon(.09, 1, u => (-.64 + .08 * Math.sin(39 * u)) * cover(u), u => .56 * cover(u)),
      '#862C36', 103, { bleed: .22, texture: .87, border: .51 });
    pigment(appendixRibbon(.30, .95, u => .15 * cover(u), u => (.43 + .08 * Math.cos(40 * u)) * cover(u)),
      '#94353B', 81, { bleed: .17, texture: .86, border: .35 });
  }, 'multiply', tubeCrop);
}

let fibrin;
export function exudateWash() {
  return fibrin ??= washLayer(71593, () => {
    pigment(appendixRibbon(.20, .998, u => (-.76 + .12 * Math.sin(53 * u)) * cover(u),
      u => (.49 + .16 * Math.sin(62 * u)) * cover(u)), '#CABC88', 103,
    { bleed: .23, texture: .92, border: .52, split: .33 });
    pigment(appendixRibbon(.27, .95, u => (-.49 + .11 * Math.cos(52 * u)) * cover(u),
      u => (-.11 + .14 * Math.sin(57 * u)) * cover(u)), '#DDD1A5', 156,
    { bleed: .20, texture: .89, border: .45, split: .32 });
    pigment(appendixRibbon(.36, .92, u => (.07 + .18 * Math.sin(55 * u)) * cover(u),
      u => (.25 + .16 * Math.sin(55 * u)) * cover(u)), '#E4D4A1', 133,
    { bleed: .16, texture: .90, border: .42, split: .27 });
  }, 'multiply', tubeCrop);
}

let necrosis;
export function necrosisWash() {
  return necrosis ??= washLayer(51281, () => {
    const spread = (u, t) => cover(u) * clamp(t * 9) * (.99 + .13 * Math.sin(u * 88));
    pigment(appendixRibbon(.28, 1, (u, t) => -spread(u, t), spread), '#7A1C24', 248,
      { bleed: .4, texture: .94, border: .52, split: .26 });
    pigment(appendixRibbon(.35, 1, (u, t) => -.91 * spread(u, t), (u, t) => .93 * spread(u, t)), '#1C1719', 250,
      { bleed: .4, direction: 'in', texture: .88, border: .64, split: .31 });
    pigment(appendixRibbon(.44, .997, u => -.57 * cover(u), u => .64 * cover(u)), '#1C1719', 213,
      { bleed: .27, texture: .95, border: .43 });
    pigment(appendixRibbon(.46, .89, u => (-.68 + .10 * Math.sin(u * 68)) * cover(u),
      u => (-.48 + .12 * Math.sin(u * 63)) * cover(u)), '#783237', 103,
    { bleed: .4, texture: .85, border: .24 });
    pigment(appendixRibbon(.53, .92, u => (.62 + .10 * Math.sin(u * 90)) * cover(u),
      u => (.72 + .16 * Math.sin(u * 88)) * cover(u)), '#7A1C24', 136,
    { bleed: .4, texture: .82, border: .44 });
  }, 'normal', tubeCrop);
}
