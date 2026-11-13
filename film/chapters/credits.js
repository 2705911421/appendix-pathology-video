import {drawCredits, prepareCredits} from '../lib_ext/credits_draw.js';

let state = null;

export default {
  async prepare() {
    state = await prepareCredits(new URLSearchParams(location.search));
  },
  draw(ctx, t) {
    drawCredits(ctx, t, state);
  },
};
