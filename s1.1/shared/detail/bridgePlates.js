// The render host supplies transparent poses produced by the next act's actual renderer.
export function mountBridgePlates(root) {
  const images = new Map((globalThis.__bridgeParts ?? []).map(part => {
    const image = document.createElement('img');
    image.alt = '';
    image.hidden = true;
    image.src = `/bridge-plates/${part}.png`;
    Object.assign(image.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    root.append(image);
    return [part, image];
  }));
  return {
    available: images.size > 0,
    ready: Promise.all([...images.values()].map(image => image.decode())),
    show(weights = {}) {
      for (const [part, image] of images) {
        const opacity = weights[part] ?? 0;
        image.hidden = opacity === 0;
        image.style.opacity = String(opacity);
      }
    },
  };
}

export function selectEntryPart(root, part) {
  for (const node of root.querySelectorAll('[data-entry-part]')) {
    node.style.visibility = node.dataset.entryPart === part ? '' : 'hidden';
  }
}
