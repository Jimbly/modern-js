const assert = require('assert');
const example = require('./example.js');

export let total_time = 0;
export let canvas = null;

export function main(canvas_in) {
  assert(canvas_in);
  canvas = canvas_in;
  let loading = document.getElementById('loading');
  loading.style.visibility = 'hidden';

  let last_frame = Date.now();
  function tick() {
    let now = Date.now();
    let dt = now - last_frame;
    total_time += dt;
    last_frame = now;
    example.go(canvas, dt);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
