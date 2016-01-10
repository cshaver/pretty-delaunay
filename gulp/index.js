'use strict';

import gulp        from 'gulp';
import fs          from 'fs';
import onlyScripts from './util/scriptFilter';

const tasks = fs.readdirSync('./gulp/tasks/').filter(onlyScripts);

tasks.forEach((task) => {
  require('./tasks/' + task);
});

gulp.task('default', ['dev']);
