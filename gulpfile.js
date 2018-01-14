// Require modules
const gulp = require('gulp');
const browserify = require('browserify');
const uglify = require('gulp-uglify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const gutil = require('gulp-util');

// Build task
gulp.task('default', function () {
  // set up the browserify instance on a task basis
  return browserify({
    entries: [
      './src/Typr.js'
    ],
    debug: true
  }).bundle()
    .pipe(source('typr.js'))
    .pipe(buffer())
    .pipe(uglify())
    .on('error', function (err) {
      gutil.log(gutil.colors.red('[Error]'), err.toString());
      this.emit('end');
    })
    .pipe(gulp.dest('./build/'));
});