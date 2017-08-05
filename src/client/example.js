
const main = require('./main.js');

export function go(canvas) {
  // could also use main.canvas
  let ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let grd = ctx.createLinearGradient(0,0,200,0);
  grd.addColorStop(0,'red');
  grd.addColorStop(1,'white');

  // Fill with gradient
  ctx.fillStyle = grd;
  let dx = Math.sin(main.total_time * 0.005) * 20;
  ctx.fillRect(10 + dx,10,150 + dx,80);
}
