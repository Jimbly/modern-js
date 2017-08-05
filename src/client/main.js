// jQuery: /*global $: false */
/*global assert: false */

export let total_time = 0;
export let canvas = null;

export function main(canvas_in) {
  const example = require('./example.js');
  assert(canvas_in);
  canvas = canvas_in;
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
