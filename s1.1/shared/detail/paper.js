import { HEIGHT, WIDTH } from './geometry.js';
import { displayDensity } from '../renderProfile.js';

const vertex = `
attribute vec2 aTexCoord;
void main() {
  gl_Position = vec4(aTexCoord.x * 2.0 - 1.0, 1.0 - aTexCoord.y * 2.0, 0.0, 1.0);
}`;

const fragment = `
precision highp float;
uniform float uHeight;
uniform float uDensity;
uniform int uPlate;
float hash(vec2 v) {
  vec3 p = fract(vec3(v.xyx) * .1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float inside(vec2 p, vec4 r) {
  vec2 from = smoothstep(r.xy - 15.0, r.xy + 5.0, p);
  vec2 to = 1.0 - smoothstep(r.zw - 5.0, r.zw + 15.0, p);
  return from.x * from.y * to.x * to.y;
}
void main() {
  vec2 px = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uDensity;
  float lettering = uPlate < 0 ? 0.0 : smoothstep(887.0, 920.0, px.y);
  if (uPlate == 0) {
    lettering = max(lettering, inside(px, vec4(74.0, 478.0, 339.0, 724.0)));
    lettering = max(lettering, inside(px, vec4(625.0, 712.0, 765.0, 772.0)));
  } else if (uPlate == 1) {
    lettering = max(lettering, inside(px, vec4(105.0, 71.0, 484.0, 139.0)));
    lettering = max(lettering, inside(px, vec4(1330.0, 280.0, 1720.0, 351.0)));
    lettering = max(lettering, inside(px, vec4(1070.0, 824.0, 1780.0, 902.0)));
  } else if (uPlate >= 0) {
    lettering = max(lettering, inside(px, vec4(65.0, 276.0, 513.0, 789.0)));
    lettering = max(lettering, inside(px, vec4(609.0, 105.0, 1620.0, 181.0)));
    lettering = max(lettering, inside(px, vec4(1200.0, 747.0, 1768.0, 816.0)));
  }
  float speck = hash(floor(gl_FragCoord.xy * vec2(1.0, -1.0) + vec2(0.0, uHeight))) - .5;
  float fibres = hash(floor(vec2((px.x + px.y * .24) / 3.8, px.y * .68))) - .5;
  float grain = speck * .78 + fibres * .22;
  float alpha = min(.034, abs(grain) * .071) * mix(1.0, .13, lettering);
  vec3 tone = mix(vec3(.33, .26, .20), vec3(1.0, .985, .947), step(0.0, grain));
  gl_FragColor = vec4(tone * alpha, alpha);
}`;

export async function createPaper(mount, { width = WIDTH, height = HEIGHT } = {}) {
  const { default: P5 } = await import('p5');
  return new Promise((resolve, reject) => {
    new P5(p => {
      p.setup = () => {
        try {
          p.pixelDensity(displayDensity());
          p.createCanvas(width, height, p.WEBGL);
          p.noLoop();
          p.noStroke();
          const shader = p.createShader(vertex, fragment);
          let currentPlate;
          resolve((plate = 0) => {
            if (plate === currentPlate) return;
            p.clear();
            p.shader(shader);
            shader.setUniform('uHeight', p.canvas.height);
            shader.setUniform('uDensity', p.pixelDensity());
            shader.setUniform('uPlate', plate);
            p.plane(width, height, 1, 1);
            p.drawingContext.finish();
            currentPlate = plate;
          });
        } catch (error) {
          reject(error);
        }
      };
    }, mount);
  });
}
