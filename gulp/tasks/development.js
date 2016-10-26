'use strict';

import gulp        from 'gulp';
import runSequence from 'run-sequence';

gulp.task('dev', function(cb) {

  global.isProd = false;

  runSequence(['styles', 'lint', 'jscs', 'browserify'], 'watch', cb);

});
