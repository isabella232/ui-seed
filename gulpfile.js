'use strict';
const fs = require('fs');
const cp = require('child_process');
const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const del = require('del');
const browserSync = require('browser-sync');
const reload = browserSync.reload;
const watchify = require('watchify');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');
const log = require('fancy-log');
const SassString = require('node-sass').types.String;
const notifier = require('node-notifier');
const runSequence = require('run-sequence');
const through2 = require('through2');
var GULP_ADDONS = require('./gulp-addons');

// /////////////////////////////////////////////////////////////////////////////
// --------------------------- Variables -------------------------------------//
// ---------------------------------------------------------------------------//

// The package.json
var pkg;

// Environment
// Set the correct environment, which controls what happens in config.js
if (!process.env.DS_ENV) {
  if (!process.env.CIRCLE_BRANCH || process.env.CIRCLE_BRANCH !== process.env.PRODUCTION_BRANCH) {
    process.env.DS_ENV = 'staging';
  } else {
    process.env.DS_ENV = 'production';
  }
}

var prodBuild = false;

// /////////////////////////////////////////////////////////////////////////////
// ------------------------- Helper functions --------------------------------//
// ---------------------------------------------------------------------------//

function readPackage () {
  pkg = JSON.parse(fs.readFileSync('package.json'));
}
readPackage();

// /////////////////////////////////////////////////////////////////////////////
// ------------------------- Callable tasks ----------------------------------//
// ---------------------------------------------------------------------------//

gulp.task('default', ['clean'], function () {
  prodBuild = true;
  gulp.start('build');
});

gulp.task('serve', ['vendorScripts', 'javascript', 'styles'], function () {
  browserSync({
    port: 3000,
    server: {
      baseDir: ['.tmp', 'sandbox'],
      routes: {
        '/node_modules': './node_modules'
      },
      middleware: GULP_ADDONS.graphicsMiddleware(fs)
    }
  });

  // watch for changes
  gulp.watch([
    'sandbox/**/*.html',
    'sandbox/assets/graphics/**/*',
    '!sandbox/assets/graphics/collecticons/**/*'
  ]).on('change', reload);

  gulp.watch('assets/icons/ui-seed-icons/**', ['ui-seed:icons']);
  gulp.watch('sandbox/assets/graphics/collecticons/**', ['collecticons']);

  gulp.watch(['sandbox/assets/styles/**/*.scss', 'assets/styles/**/*.scss'], ['styles']);
  gulp.watch('package.json', ['vendorScripts']);
});

gulp.task('clean', function () {
  return del(['.tmp', 'dist']);
});

// /////////////////////////////////////////////////////////////////////////////
// ------------------------- Browserify tasks --------------------------------//
// ------------------- (Not to be called directly) ---------------------------//
// ---------------------------------------------------------------------------//

// Compiles the user's script files to bundle.js.
// When including the file in the index.html we need to refer to bundle.js not
// main.js
gulp.task('javascript', function () {
  var watcher = watchify(browserify({
    entries: ['./sandbox/assets/scripts/main.js'],
    debug: true,
    cache: {},
    packageCache: {},
    fullPaths: true
  }), { poll: true });

  function bundler () {
    if (pkg.dependencies) {
      watcher.external(Object.keys(pkg.dependencies));
    }
    return watcher.bundle()
      .on('error', function (e) {
        notifier.notify({
          title: 'Oops! Browserify errored:',
          message: e.message
        });
        console.log('Javascript error:', e);
        if (prodBuild) {
          process.exit(1);
        }
        // Allows the watch to continue.
        this.emit('end');
      })
      .pipe(source('bundle.js'))
      .pipe(buffer())
      // Source maps.
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('.tmp/assets/scripts'))
      .pipe(reload({ stream: true }));
  }

  watcher
    .on('log', log)
    .on('update', bundler);

  return bundler();
});

// Vendor scripts. Basically all the dependencies in the package.js.
// Therefore be careful and keep the dependencies clean.
gulp.task('vendorScripts', function () {
  // Ensure package is updated.
  readPackage();
  var vb = browserify({
    debug: true,
    require: pkg.dependencies ? Object.keys(pkg.dependencies) : []
  });
  return vb.bundle()
    .on('error', log.bind(log, 'Browserify Error'))
    .pipe(source('vendor.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('.tmp/assets/scripts/'))
    .pipe(reload({ stream: true }));
});

// /////////////////////////////////////////////////////////////////////////////
// ----------------------- UI Seed icons tasks --------------------------------//
// -------------------- (Font generation related) ----------------------------//
// ---------------------------------------------------------------------------//
gulp.task('ui-seed:icons', function (done) {
  var args = [
    'node_modules/collecticons-processor/bin/collecticons.js',
    'compile',
    'assets/icons/ui-seed-icons/',
    '--font-embed',
    '--font-dest', 'assets/fonts',
    '--font-name', 'UI Seed Icons',
    '--font-types', 'woff',
    '--style-format', 'sass',
    '--style-dest', 'assets/styles/ui-seed/core',
    '--style-name', 'ui-seed-icons',
    '--class-name', 'uisi',
    '--author-name', 'Development Seed',
    '--author-url', 'https://developmentseed.org/',
    '--no-preview'
  ];

  return cp.spawn('node', args, {stdio: 'inherit'})
    .on('close', done);
});

// //////////////////////////////////////////////////////////////////////////////
// --------------------------- Helper tasks -----------------------------------//
// ----------------------------------------------------------------------------//

gulp.task('build', function () {
  runSequence(['vendorScripts', 'javascript', 'styles'], ['html', 'images', 'extras'], function () {
    return gulp.src('dist/**/*')
      .pipe($.size({ title: 'build', gzip: true }))
      .pipe($.exit());
  });
});

gulp.task('styles', function () {
  return gulp.src('sandbox/assets/styles/main.scss')
    .pipe($.plumber(function (e) {
      notifier.notify({
        title: 'Oops! Sass errored:',
        message: e.message
      });
      console.log('Sass error:', e.toString());
      if (prodBuild) {
        process.exit(1);
      }
      // Allows the watch to continue.
      this.emit('end');
    }))
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: 'expanded',
      precision: 10,
      functions: {
        'urlencode($url)': function (url) {
          var v = new SassString();
          v.setValue(encodeURIComponent(url.getValue()));
          return v;
        }
      },
      includePaths: require('node-bourbon').with('node_modules/jeet', 'assets/styles')
    }))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.tmp/assets/styles'))
    .pipe(reload({ stream: true }));
});

gulp.task('html', function () {
  return gulp.src('sandbox/*.html')
    .pipe($.useref({ searchPath: ['.tmp', 'sandbox', '.'] }))
    .pipe(cacheUseref())
    // Do not compress comparisons, to avoid MapboxGLJS minification issue
    // https://github.com/mapbox/mapbox-gl-js/issues/4359#issuecomment-286277540
    .pipe($.if('*.js', $.uglify({ compress: { comparisons: false } })))
    .pipe($.if('*.css', $.csso()))
    .pipe($.if(/\.(css|js)$/, $.rev()))
    .pipe($.revRewrite())
    .pipe(gulp.dest('dist'));
});

gulp.task('images', function () {
  return gulp.src(['sandbox/assets/graphics/**/*', GULP_ADDONS.graphicsPath + '/**/*'])
  .pipe($.imagemin([
    $.imagemin.gifsicle({ interlaced: true }),
    $.imagemin.jpegtran({ progressive: true }),
    $.imagemin.optipng({ optimizationLevel: 5 }),
    // don't remove IDs from SVGs, they are often used
    // as hooks for embedding and styling
    $.imagemin.svgo({ plugins: [{ cleanupIDs: false }] })
  ]))
    .pipe(gulp.dest('dist/assets/graphics'));
});

gulp.task('humans', function () {
  let date = new Date();
  let day = date.getDate();
  day = day < 10 ? `0${day}` : day;
  let month = date.getMonth() + 1;
  month = month < 10 ? `0${month}` : month;
  let year = date.getFullYear();

  return gulp.src('sandbox/humans.txt')
    .pipe($.ejs({
      lastUpdate: `${year}/${month}/${day}`
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('extras', ['humans'], function () {
  return gulp.src([
    'sandbox/**/*',
    '!sandbox/*.html',
    '!sandbox/humans.txt',
    '!sandbox/assets/graphics/**',
    '!sandbox/assets/vendor/**',
    '!sandbox/assets/styles/**',
    '!sandbox/assets/scripts/**'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

/**
 * Caches the useref files.
 * Avoid sending repeated js and css files through the minification pipeline.
 * This happens when there are multiple html pages to process.
 */
function cacheUseref () {
  let files = {
    // path: content
  };
  return through2.obj(function (file, enc, cb) {
    const path = file.relative;
    if (files[path]) {
      // There's a file in cache. Check if it's the same.
      const prev = files[path];
      if (Buffer.compare(file.contents, prev) !== 0) {
        this.push(file);
      }
    } else {
      files[path] = file.contents;
      this.push(file);
    }
    cb();
  });
}

