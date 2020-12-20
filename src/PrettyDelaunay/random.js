import Point from './point';

const Random = {
  // hey look a closure
  // returns function for random numbers with pre-set max and min
  randomNumberFunction: function(max, min) {
    min = min || 0;
    if (min > max) {
      var temp = max;
      max = min;
      min = temp;
    }
    return function() {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
  },

  // returns a random number
  // between the max and min
  randomBetween: function(max, min) {
    min = min || 0;
    return Random.randomNumberFunction(max, min)();
  },

  randomInCircle: function(radius, ox, oy) {
    var angle = Math.random() * Math.PI * 2;
    var rad = Math.sqrt(Math.random()) * radius;
    var x = ox + rad * Math.cos(angle);
    var y = oy + rad * Math.sin(angle);

    return new Point(x, y);
  },

  randomRgb: function() {
    return 'rgb(' + Random.randomBetween(255) + ',' +
                     Random.randomBetween(255) + ',' +
                     Random.randomBetween(255) + ')';
  },

  randomRgba: function() {
    return 'rgba(' + Random.randomBetween(255) + ',' +
                     Random.randomBetween(255) + ',' +
                     Random.randomBetween(255) + ', 1)';
  },

  randomHsla: function() {
    return 'hsla(' + Random.randomBetween(360) + ',' +
                     Random.randomBetween(100) + '%,' +
                     Random.randomBetween(100) + '%, 1)';
  },
};

export default Random;
