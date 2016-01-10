'use strict';

import istanbul from 'browserify-istanbul';
import isparta  from 'isparta';

module.exports = function(config) {

  config.set({

    basePath: '../',
    frameworks: ['jasmine', 'browserify'],
    preprocessors: {
      'app/js/**/*.js': ['browserify', 'coverage'],
    },
    browsers: ['Chrome'],
    reporters: ['progress', 'coverage'],

    autoWatch: true,

    browserify: {
      debug: true,
      extensions: ['.js', '.jsx'],
      transform: [
        'babelify',
        'bulkify',
        istanbul({
          instrumenter: isparta,
          ignore: ['**/node_modules/**', '**/test/**'],
        }),
      ],
    },

    proxies: {
      '/': 'http://localhost:9876/',
    },

    urlRoot: '/__karma__/',

    files: [
      // app-specific code
      'app/js/main.js',

      // 3rd-party resources
      'node_modules/angular-mocks/angular-mocks.js',

      // test files
      'test/unit/**/*.js',
    ],

  });

};
