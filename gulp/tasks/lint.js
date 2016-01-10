'use strict';

import config from '../config';
import gulp   from 'gulp';
import jshint from 'gulp-jshint';

gulp.task('lint', function() {
  return gulp.src([config.scripts.src, '!**/_*'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});
