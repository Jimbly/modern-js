// This is the only .js file running at a global scope

(function () {
  var debug = document.getElementById('debug');
  window.onerror = function (e, file, line) {
    debug.innerText = e + '\n  at ' + file + '(' + line + ')';
  };
}());

var canvasSupported = true;
(function() {
  var contextNames = ['webgl', 'experimental-webgl'];
  var context = null;
  var canvas = document.createElement('canvas');

  document.body.appendChild(canvas);

  for (var i = 0; i < contextNames.length; i += 1) {
    try {
      context = canvas.getContext(contextNames[i]);
    } catch (e) {}

    if (context) {
      break;
    }
  }
  if (!context)
  {
    canvasSupported = false;
    window.alert('Sorry, but your browser does not support WebGL or does not have it enabled.');
  }

  document.body.removeChild(canvas);
}());

window.assert = function(exp) {
  if (!exp) {
    console.log(new Error().stack);
    window.alert('assertion failed');
  }
};

// Embedded code and startup code.
window.onload = function () {
  const main = require('./main.js');
  var canvas = document.getElementById('my_canvas');
  canvas.focus();

  function resizeCanvas() {
    var css_to_real = window.devicePixelRatio || 1;

    canvas.width = Math.floor(canvas.clientWidth * css_to_real);
    canvas.height = Math.floor(canvas.clientHeight * css_to_real);

    // This used to be here, but it breaks mobile devices!
    // Might be needed to get gamepad input though?
    //canvas.focus();

    // maybe force trigger immediate draw too?
  }
  // resize the canvas to fill browser window dynamically
  window.addEventListener('resize', resizeCanvas, false);
  resizeCanvas();

  if (canvas.getContext && canvasSupported) {
    main.main(canvas);
  }
};
