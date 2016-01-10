'use strict';

import gulp        from 'gulp';
import runSequence from 'run-sequence';

gulp.task('prod', ['clean'], function(cb) {

  global.isProd = true;

  runSequence(['styles', 'lint', 'jscs', 'browserify'], cb);

});
