'use strict';

export default {
  sourceDir: './lib/',
  buildDir: './dist/',

  styles: {
    src: 'demo/styles/**/*.scss',
    dest: 'demo/styles',
    prodSourcemap: false,
    sassIncludePaths: [],
  },

  scripts: {
    src: 'lib/**/*.js',
    dest: 'dist',
  },

  assetExtensions: [
    'js',
    'css',
  ],

  browserify: {
    bundleName: 'pretty-delaunay.js',
    prodSourcemap: false
  },

  test: {
    karma: 'test/karma.conf.js',
    protractor: 'test/protractor.conf.js'
  },

  init: function() {
    return this;
  }

}.init();
