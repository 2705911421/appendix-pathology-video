import assert from 'node:assert/strict';
import { test } from 'node:test';
import { morphShape, morphToLens } from '../shared/canvasCore.js';

const specimen = 'M20,10 C82,0 120,60 99,128 C86,160 42,178 17,147 C2,124 6,55 20,10Z';
const swollen = 'M8,18 C48,-12 123,1 135,61 C151,133 99,175 49,173 C-9,158 -35,69 8,18Z';

test('shape morph keeps exact endpoints, interpolates and clamps time', () => {
  const shape = morphShape(specimen, swollen);
  const middle = shape(0.48);
  assert.equal(shape(-1), specimen);
  assert.equal(shape(2), swollen);
  assert.match(middle, /^M[\d.,L+e-]+Z$/i);
  assert.notEqual(middle, shape(0.22));
  assert.equal(shape(0.48), middle);
});

test('lens morph retains the source and lands on the requested circle', () => {
  const lens = morphToLens(specimen, { x: 180, y: 220, radius: 50 });
  const early = lens(0.3);
  assert.equal(lens(0), specimen);
  const circle = lens(1);
  assert.equal(circle, 'M130 220 a50 50 0 1 0 100 0 a50 50 0 1 0 -100 0Z');
  assert.notEqual(lens(0.82), early);
  assert.equal(lens(0.3), early);
  assert.equal(lens(1.8), circle);
});
