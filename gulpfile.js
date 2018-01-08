// Require modules
const gulp = require('gulp');
const umd = require('gulp-umd');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

// Build task
gulp.task('umd', function (cb) {
  // set up the browserify instance on a task basis

  return browserify({
    //basedir: './src',
    entries: [
      './src/Typr.js',
      './src/Typr.U.js'
    ],
    debug: true
    // defining transforms here will avoid crashing your stream
    //transform: [reactify]

  }).bundle()
    .on('error', function (err) {
      console.error(err.stack);
      this.emit('end');
    })
    .pipe(source('bundle.js'))
    //.pipe(buffer())
    //.pipe(sourcemaps.init({loadMaps: true}))
    // Add transformation tasks to the pipeline here.
    //.pipe(uglify())
    //.on('error', log.error)
    //.pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./build/'));
});