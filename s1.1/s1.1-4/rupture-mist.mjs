import { lerp, mulberry32, organic, pigment, washLayer } from '../shared/canvasCore.js';
import { phase } from './scene-tools.mjs';

const pigments = ['#B5A063', '#C7AE68', '#AC975A'];
const trails = [
  'M106 66 C126 79 112 92 136 110 C145 119 148 134 138 142 C119 141 124 123 111 111 C99 97 96 79 106 66Z',
  'M109 65 C97 85 115 91 104 113 C97 127 78 141 80 154 C95 147 108 138 116 122 C128 102 120 82 109 65Z',
  'M109 65 C114 83 141 86 154 109 C168 134 147 141 139 153 C147 137 155 127 145 114 C132 97 111 93 109 65Z',
];

function wisps() {
  return trails.map((outline, i) => {
    const wash = washLayer(39187 + i * 381, () => {
      pigment(outline, pigments[i], 117 - i * 15, { bleed: .4, texture: .87, border: .32, split: .36 });
      const fold = organic(120 + (i - 1) * 14, 122, 17 + i * 4, 16, 856 + i, .38, .33 - i * .45);
      pigment(fold, '#D1B86B', 74, { bleed: .4, texture: .75, border: .25 });
    }, 'multiply', [49, 45, 140, 152]);
    return `<g id="s18-wisp-model-${i}" filter="url(#s18-vapor-feather-${i})" transform="translate(-109 -65)">${wash}</g>`;
  }).join('');
}

function emitters() {
  const rand = mulberry32(9313);
  const vapor = Array.from({ length: 8 }, (_, i) => ({
    id: `s18-vapor-${i}`, start: .405 + .031 * i, cycle: .30 + .12 * rand(),
    drift: (i % 2 ? -1 : 1) * (13 + rand() * 30), fall: 42 + rand() * 54,
    sway: 5 + rand() * 11, spin: rand() * 46 - 23,
  }));
  const droplets = Array.from({ length: 19 }, (_, i) => ({
    id: `s18-drop-${i}`, start: .415 + .195 * i / 19, cycle: .27 + .16 * rand(),
    drift: -26 + 64 * rand(), fall: 46 + 64 * rand(), radius: 1 + rand() * 2.05,
  }));
  return { vapor, droplets };
}

function ageAt(p, { start, cycle }) {
  return p < start ? 0 : ((p - start) % cycle) / cycle;
}

export function ruptureMist() {
  const { vapor, droplets } = emitters();
  const paint = `<defs>
    ${[4.8, 6.6, 8.4].map((blur, i) => `<filter id="s18-vapor-feather-${i}" filterUnits="userSpaceOnUse"
      x="29" y="25" width="205" height="203"><feGaussianBlur stdDeviation="${blur}"/></filter>`).join('')}
    ${wisps()}
  </defs>
  <g id="s18-liquid-drift">
    ${vapor.map(({ id }, i) => `<use id="${id}" href="#s18-wisp-model-${i % 3}" opacity="0"/>`).join('')}
    ${droplets.map(({ id, radius }, i) => `<g id="${id}" opacity="0">
      <ellipse rx="${radius}" ry="${radius * 1.24}" fill="${i % 2 ? '#B3985D' : '#CDB276'}" opacity=".81"/>
      <ellipse cx="-.35" cy="-.22" rx="${radius * .44}" ry="${radius * .48}" fill="#EEE1B4" opacity=".53"/>
    </g>`).join('')}
  </g>`;
  let particles;
  let beads;
  return {
    paint,
    mount(art, anchor) {
      art.querySelector('#s18-liquid-drift').setAttribute('transform', `translate(${anchor.x} ${anchor.y})`);
      particles = vapor.map(item => ({ ...item, node: art.querySelector(`#${item.id}`) }));
      beads = droplets.map(item => ({ ...item, node: art.querySelector(`#${item.id}`) }));
    },
    update(p) {
      for (const item of particles) {
        const age = ageAt(p, item);
        const x = item.drift * age + item.sway * Math.sin(age * 4.8) * age;
        const y = item.fall * age ** 1.13;
        const size = lerp(.37, 1.22, age);
        const opacity = .59 * phase(age, 0, .19) * (1 - phase(age, .40, 1));
        item.node.setAttribute('transform', `translate(${x} ${y}) rotate(${item.spin * age}) scale(${size})`);
        item.node.setAttribute('opacity', opacity);
      }
      for (const item of beads) {
        const age = ageAt(p, item);
        const x = item.drift * age + 5.5 * Math.sin(age * 5.3) * age;
        const y = 5 * age + item.fall * age ** 1.45;
        item.node.setAttribute('transform', `translate(${x} ${y}) rotate(${15 * age})`);
        item.node.setAttribute('opacity', .71 * phase(age, 0, .1) * (1 - phase(age, .53, 1)));
      }
    },
  };
}
