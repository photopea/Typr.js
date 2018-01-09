// Require modules
const gulp = require('gulp');
const umd = require('gulp-umd');
const browserify = require('browserify');
const uglify = require('gulp-uglify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const gutil = require('gulp-util');

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
    .pipe(source('bundle.js'))
    .pipe(buffer())
    //.pipe(sourcemaps.init({loadMaps: true}))
    // Add transformation tasks to the pipeline here.
    .pipe(uglify())
    //.on('error', log.error)
    //.pipe(sourcemaps.write('./'))
    .on('error', function (err) {
      gutil.log(gutil.colors.red('[Error]'), err.toString());
      //console.error(err.stack);
      this.emit('end');
    })
    .pipe(gulp.dest('./build/'));
});