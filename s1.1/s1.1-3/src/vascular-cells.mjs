import { fillPath } from '../../shared/canvasCore.js';
import { VASCULAR_NUCLEUS } from '../../shared/charactersAndHistology.js';

export const NUCLEUS = '#351264';
export const CYTOPLASM_ALPHA = .55;
export const CHROMATIN_WIDTH = .85;

export const stainNuclei = markup => markup.replaceAll(VASCULAR_NUCLEUS, NUCLEUS);

export function vascularCellMarkup(id, { boundary, transform, detail, edge }, radius) {
  const stained = stainNuclei(detail).replace(/(stroke="#351264" stroke-width=")[^"]+/g,
    (_match, prefix) => prefix + CHROMATIN_WIDTH / radius);
  const cytoplasm = `rgba(226, 200, 236, ${CYTOPLASM_ALPHA})`;
  return `<defs><clipPath id="${id}-cytoplasm"><path d="${boundary}" transform="${transform}"/></clipPath></defs>
    <g transform="${transform}">${fillPath(boundary, cytoplasm)}</g>
    <g clip-path="url(#${id}-cytoplasm)">${stained}</g>${edge}`;
}
