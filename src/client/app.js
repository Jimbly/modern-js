/* eslint no-alert:off, consistent-return:off */
(function () {
  let debug = document.getElementById('debug');
  window.onerror = function (e, file, line, col, errorobj) {
    let msg = errorobj && errorobj.stack || `${e}\n  at ${file}(${line}:${col})`;
    debug.innerText = `${msg}\n`;
  };
  window.debugmsg = function (msg) {
    debug.innerText += `${msg}\n`;
  };
}());

// Embedded code and startup code.
window.onload = function () {
  // eslint-disable-next-line global-require
  const main = require('./main.js');

  let canvas = document.getElementById('canvas');

  function resizeCanvas() {
    let css_to_real = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * css_to_real);
    canvas.height = Math.round(canvas.clientHeight * css_to_real);
  }
  // resize the canvas to fill browser window dynamically
  window.addEventListener('resize', resizeCanvas, false);
  resizeCanvas();

  let contextNames = ['2d', 'webgl', 'experimental-webgl'];
  for (let i = 0; i < contextNames.length; i += 1) {
    let context;
    try {
      context = canvas.getContext(contextNames[i]);
    } catch (e) {
      // ignore
    }
    if (context) {
      return main.main(canvas);
    }
  }
  window.alert('Sorry, but your browser does not support WebGL or does not have it enabled.');
};
