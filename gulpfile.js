/* eslint no-invalid-this:off */
const args = require('yargs').argv;
const babel = require('gulp-babel');
const babelify = require('babelify');
const browserify = require('browserify');
const browser_sync = require('browser-sync');
const fs = require('fs');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const eslint = require('gulp-eslint');
const lazypipe = require('lazypipe');
const log = require('fancy-log');
const useref = require('gulp-useref');
const uglify = require('gulp-uglify');
const newer = require('gulp-newer');
const nodemon = require('gulp-nodemon');
const replace = require('gulp-replace');
const sourcemaps = require('gulp-sourcemaps');
const web_compress = require('gulp-web-compress');
const vinyl_buffer = require('vinyl-buffer');
const vinyl_source_stream = require('vinyl-source-stream');
const watchify = require('watchify');

//////////////////////////////////////////////////////////////////////////
// Server tasks
const config = {
  server_js_files: ['src/**/*.js', '!src/client/**/*.js'],
  all_js_files: ['src/**/*.js', '!src/client/vendor/**/*.js'],
  client_html: ['src/client/**/*.html'],
  client_css: ['src/client/**/*.css', '!src/client/sounds/Bfxr/**'],
  client_static: [
    'src/client/**/*.mp3',
    'src/client/**/*.wav',
    'src/client/**/*.ogg',
    'src/client/**/*.png',
    '!src/client/sounds/Bfxr/**',
    // 'src/client/**/vendor/**',
  ],
  client_vendor: ['src/client/**/vendor/**'],
};

// At least keep function names to get good callstacks
// const uglify_options = { keep_fnames: true };
// Do no significant minification to make debugging easier, better error reports
const uglify_options = { compress: false, mangle: false };

// gulp.task('inspect', function () {
//   gulp.src([]).pipe(node_inspector({
//     debugPort: 5858,
//     webHost: '0.0.0.0',
//     webPort: '8080',
//     preload: false
//   }));
// });

gulp.task('server_js', function () {
  return gulp.src(config.server_js_files)
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./build.dev'));
});

gulp.task('eslint', function () {
  return gulp.src(config.all_js_files)
    .pipe(eslint())
    .pipe(eslint.format());
});

//////////////////////////////////////////////////////////////////////////
// client tasks
gulp.task('client_html', function () {
  return gulp.src(config.client_html)
    // .pipe(eslint())
    // .pipe(eslint.format())
    .pipe(useref({}, lazypipe().pipe(sourcemaps.init, { loadMaps: true })))
    .on('error', log.error.bind(log, 'client_html Error'))
    .pipe(sourcemaps.write('./')) // writes .map file
    .pipe(gulp.dest('./build.dev/client'));
});

gulp.task('client_css', function () {
  return gulp.src(config.client_css)
    .pipe(gulp.dest('./build.dev/client'))
    .pipe(browser_sync.reload({ stream: true }));
});

gulp.task('client_static', function () {
  return gulp.src(config.client_static)
    .pipe(newer('./build.dev/client'))
    .pipe(gulp.dest('./build.dev/client'));
});

//////////////////////////////////////////////////////////////////////////
// Fork of https://github.com/Jam3/brfs-babel that adds bablerc:false
const babel_core = require('babel-core');
const through = require('through2');
const babel_static_fs = require('babel-plugin-static-fs');
function babelBrfs(filename, opts) {
  let input = '';
  if ((/\.json$/iu).test(filename)) {
    return through();
  }

  function write(buf, enc, next) {
    input += buf.toString();
    next();
  }

  function flush(next) {
    let result;
    try {
      result = babel_core.transform(input, {
        plugins: [
          [
            babel_static_fs, {
              // ensure static-fs files are discovered
              onFile: this.emit.bind(this, 'file')
            }
          ]
        ],
        filename: filename,
        babelrc: false,
      });
      this.push(result.code);
      this.push(null);
      return next();
    } catch (err) {
      return next(err);
    }
  }

  return through(write, flush);
}
// End fork of https://github.com/Jam3/brfs-babel
//////////////////////////////////////////////////////////////////////////

let client_js_deps = [];
let client_js_watch_deps = [];

function bundleJS(filename, is_worker) {
  let bundle_name = filename.replace('.js', '.bundle.js');
  const browserify_opts = {
    entries: [
      `./src/client/${filename}`,
    ],
    cache: {}, // required for watchify
    packageCache: {}, // required for watchify
    builtins: {
      // super-simple replacements, if needed
      assert: './src/client/shims/assert.js',
      buffer: './src/client/shims/buffer.js',
      not_worker: !is_worker && './src/client/shims/not_worker.js',
      timers: './src/client/shims/timers.js',
    },
    debug: true,
    transform: [babelBrfs]
  };
  const babelify_opts = {
    global: true, // Required because dot-prop has ES6 code in it
    plugins: [],
    // plugins: [
    //   // ['syntax-object-rest-spread', {}],
    //   // ['transform-object-rest-spread', {}],
    //   // ['static-fs', {}], - generates good code, but does not allow reloading/watchify
    // ],
  };
  function whitespaceReplace(a) {
    // gulp-replace-with-sourcemaps doens't seem to work, so just replace with exactly matching whitespace
    return a.replace(/[^\n\r]/g, ' ');
  }
  function dobundle(b) {
    return b
      //.transform(babelify, babelify_opts)
      .bundle()
      // log errors if they happen
      .on('error', log.error.bind(log, 'Browserify Error'))
      .pipe(vinyl_source_stream(bundle_name))
      // optional, remove if you don't need to buffer file contents
      .pipe(vinyl_buffer())
      // optional, remove if you don't want sourcemaps
      .pipe(sourcemaps.init({ loadMaps: true })) // loads map from browserify file
      // Remove extra Babel stuff that does not help anything
      .pipe(replace(/_classCallCheck\([^)]+\);|exports\.__esModule = true;/g, whitespaceReplace))
      .pipe(replace(/function _classCallCheck\((?:[^}]*\}){2}/g, whitespaceReplace))
      .pipe(replace(/Object\.defineProperty\(exports, "__esModule"[^}]+\}\);/g, whitespaceReplace))
      // Add transformation tasks to the pipeline here.
      .pipe(uglify(uglify_options))
      .pipe(sourcemaps.write('./')) // writes .map file
      .pipe(gulp.dest('./build.dev/client/'));
  }

  function registerTasks(b, watch) {
    let task_base = `client_js${watch ? '_watch' : ''}_${filename}`;
    b.transform(babelify, babelify_opts);
    b.on('log', log); // output build logs to terminal
    if (watch) {
      client_js_watch_deps.push(task_base);
    } else {
      client_js_deps.push(task_base);
    }
    gulp.task(task_base, function () {
      let ret = dobundle(b);
      if (watch) {
        ret = ret.pipe(browser_sync.stream({ once: true }));
      }
      return ret;
    });
  }
  const watched = watchify(browserify(browserify_opts));
  registerTasks(watched, true);
  // on any dep update, runs the bundler
  watched.on('update', gulp.series(`client_js_watch_${filename}`));

  const nonwatched = browserify(browserify_opts);
  registerTasks(nonwatched, false);
}

bundleJS('app.js');

gulp.task('build.prod', function () {
  return gulp.src('build.dev/**')
    .pipe(gulp.dest('./build.prod'))
    // skipLarger so we don't end up with orphaned old compressed files
    .pipe(gulpif(config.compress_files, web_compress({ skipLarger: false })))
    .pipe(gulp.dest('./build.prod'));
});

gulp.task('client_js', gulp.parallel(...client_js_deps));
gulp.task('client_js_watch', gulp.parallel(...client_js_watch_deps));

//////////////////////////////////////////////////////////////////////////
// Combined tasks

gulp.task('build', gulp.series(gulp.parallel('eslint', 'server_js', 'client_html',
  'client_css', 'client_static', 'client_js'), 'build.prod'));

gulp.task('bs-reload', (done) => {
  browser_sync.reload();
  done();
});

gulp.task('watch', gulp.series(
  gulp.parallel('eslint', 'server_js', 'client_html', 'client_css', 'client_static', 'client_js_watch'),
  (done) => {
    if (!args.nolint) {
      gulp.watch(config.all_js_files, gulp.series('eslint'));
    }
    gulp.watch(config.server_js_files, gulp.series('server_js'));
    gulp.watch(config.client_html, gulp.series('client_html', 'bs-reload'));
    gulp.watch(config.client_vendor, gulp.series('client_html', 'bs-reload'));
    gulp.watch(config.client_css, gulp.series('client_css'));
    gulp.watch(config.client_static, gulp.series('client_static', 'bs-reload'));
    done();
  }
));

const deps = ['watch'];
if (args.debug) {
  deps.push('inspect');
}

// Depending on "watch" not because that implicitly triggers this, but
// just to start up the watcher and reprocessor, and nodemon restarts
// based on its own logic below.
gulp.task('nodemon', gulp.series(...deps, (done) => {
  const options = {
    script: 'build.dev/server/index.js',
    nodeArgs: ['--inspect'],
    args: ['--dev'],
    watch: ['build.dev/server/', 'build.dev/common'],
  };
  if (args.debug) {
    options.nodeArgs.push('--debug');
  }
  nodemon(options);
  done();
}));

gulp.task('browser-sync', gulp.series('nodemon', (done) => {

  // for more browser-sync config options: http://www.browsersync.io/docs/options/
  browser_sync({

    // informs browser-sync to proxy our expressjs app which would run at the following location
    proxy: 'http://localhost:3000',

    // informs browser-sync to use the following port for the proxied app
    // notice that the default port is 3000, which would clash with our expressjs
    port: 4000,

    // // open the proxied app in chrome
    // browser: ['google-chrome'],

    // don't sync clicks/scrolls/forms/etc
    ghostMode: false,
  });
  done();
}));
