export function scaleAround(x, y, scale) {
  return `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`;
}

export function settleScale(p, from) {
  const remaining = p - 1;
  return from + (1 - from) * (1 + 1.7 * remaining ** 3 + .7 * remaining ** 2);
}

export function tracedInk(id, path, ink, width = 27) {
  return `<defs><mask id="${id}-mask" mask-type="alpha" maskUnits="userSpaceOnUse"
    x="0" y="0" width="1920" height="1080">
    <path id="${id}-trace" d="${path}" fill="none" stroke="white" stroke-width="${width}"
      stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" opacity="0"/>
  </mask></defs><g mask="url(#${id}-mask)">${ink}</g>`;
}

export function traceTo(root, id, progress) {
  const trace = root.querySelector(`#${id}-trace`);
  trace.setAttribute('opacity', progress > 0 ? 1 : 0);
  trace.setAttribute('stroke-dashoffset', 1 - progress);
}
