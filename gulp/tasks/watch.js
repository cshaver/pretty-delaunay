'use strict';

import config from '../config';
import gulp   from 'gulp';

gulp.task('watch', function() {

  // Scripts are automatically watched and rebundled by Watchify inside Browserify task
  gulp.watch(config.scripts.src, ['lint', 'jscs']);
  gulp.watch(config.styles.src,  ['styles']);

});
