import { appendStorySvg } from '../canvasCore.js';
import { createHistologyAsset, HISTOLOGY_DIAMETER } from '../histologyProcedural.js';
import { MICROSCOPE_HANDOFF } from '../transitionAnchors.js';
import { createStoryPaperSurface } from './transitionPaper.js';

export const HANDOFF_SLIDE_SEED = 8053;

export function mountMicroscopeHandoff(root, density) {
  const { cx, cy, radius, mode } = MICROSCOPE_HANDOFF;
  let layer, paper, lens, posed;
  return ({ opacity = 0, paperOpacity = 1, scale = 1, mask, placement } = {}) => {
    if (!layer && opacity === 0) return;
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'story-layer';
      layer.style.pointerEvents = 'none';
      layer.setAttribute('aria-hidden', 'true');
      paper = createStoryPaperSurface(density);
      layer.append(paper);
      const slide = createHistologyAsset({ id: 'microscope-handoff', stage: mode, seed: HANDOFF_SLIDE_SEED,
        x: cx - radius, y: cy - radius, scale: 2 * radius / HISTOLOGY_DIAMETER });
      lens = appendStorySvg(layer, `<g>${slide.paint}</g>`);
      posed = lens.firstElementChild;
      slide.mount(lens);
      root.append(layer);
    }
    layer.hidden = opacity === 0;
    layer.style.opacity = String(opacity);
    paper.style.opacity = String(paperOpacity);
    lens.style.clipPath = mask ? `path('${mask}')` : '';
    const { x = cx, y = cy, sx = scale, sy = scale } = placement ?? {};
    posed.setAttribute('transform', `translate(${x} ${y}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
  };
}
