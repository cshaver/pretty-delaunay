'use strict';

import config from '../config';
import gulp   from 'gulp';
import jscs   from 'gulp-jscs';

gulp.task('jscs', function() {
  return gulp.src([config.scripts.src, '!**/_*'])
    .pipe(jscs())
    .pipe(jscs.reporter());
});
