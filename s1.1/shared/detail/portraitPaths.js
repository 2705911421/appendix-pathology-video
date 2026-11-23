export function form(start, segments, closed = true) {
  const path = new Path2D();
  path.moveTo(...start);
  const points = [start];
  let [ax, ay] = start;
  for (const controls of segments) {
    const [x, y] = controls.slice(-2);
    const count = Math.max(3, Math.ceil(Math.hypot(x - ax, y - ay) / 2.8));
    if (controls.length === 2) path.lineTo(x, y);
    else if (controls.length === 4) path.quadraticCurveTo(...controls);
    else path.bezierCurveTo(...controls);
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const a = 1 - t;
      if (controls.length === 2) points.push([a * ax + t * x, a * ay + t * y]);
      else if (controls.length === 4) {
        points.push([a * a * ax + 2 * a * t * controls[0] + t * t * x,
          a * a * ay + 2 * a * t * controls[1] + t * t * y]);
      } else {
        points.push([a ** 3 * ax + 3 * a * a * t * controls[0] + 3 * a * t * t * controls[2] + t ** 3 * x,
          a ** 3 * ay + 3 * a * a * t * controls[1] + 3 * a * t * t * controls[3] + t ** 3 * y]);
      }
    }
    [ax, ay] = [x, y];
  }
  if (closed) path.closePath();
  return { path, points, start, segments, closed };
}

export const line = (start, ...segments) => form(start, segments, false);

export function oval(x, y, rx, ry) {
  const a = .55228475;
  return form([x - rx, y], [
    [x - rx, y - a * ry, x - a * rx, y - ry, x, y - ry],
    [x + a * rx, y - ry, x + rx, y - a * ry, x + rx, y],
    [x + rx, y + a * ry, x + a * rx, y + ry, x, y + ry],
    [x - a * rx, y + ry, x - rx, y + a * ry, x - rx, y],
  ]);
}
