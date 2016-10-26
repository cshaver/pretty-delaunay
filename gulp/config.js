'use strict';

export default {
  sourceDir: './src/',
  demoDir: './demo/',

  styles: {
    src: 'demo/styles/**/*.scss',
    dest: 'demo/styles',
    prodSourcemap: false,
    sassIncludePaths: [],
  },

  scripts: {
    src: 'src/demo.js',
    dest: 'demo/js',
  },

  assetExtensions: [
    'js',
    'css',
  ],

  browserify: {
    bundleName: 'pretty-delaunay.js',
    demoBundle: 'demo.js',
    prodSourcemap: false,
  },

  test: {
    karma: 'test/karma.conf.js',
    protractor: 'test/protractor.conf.js',
  },

  init: function() {
    return this;
  },

}.init();
