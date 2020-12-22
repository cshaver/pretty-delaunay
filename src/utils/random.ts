import Point from '../Point';

const Random = {
  // hey look a closure
  // returns function for random numbers with pre-set max and min
  randomNumberFunction: function (max: number, min = 0): () => number {
    if (min > max) {
      const temp = max;
      max = min;
      min = temp;
    }
    return function () {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
  },

  // returns a random integer
  // between the max and min
  randomBetween: function (max: number, min = 0): number {
    return Random.randomNumberFunction(max, min)();
  },

  randomInCircle: function (radius: number, ox: number, oy: number): Point {
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * radius;
    const x = ox + rad * Math.cos(angle);
    const y = oy + rad * Math.sin(angle);

    return new Point(x, y);
  },

  randomRgb: function (): string {
    return (
      'rgb(' +
      Random.randomBetween(255) +
      ',' +
      Random.randomBetween(255) +
      ',' +
      Random.randomBetween(255) +
      ')'
    );
  },

  randomRgba: function (): string {
    return (
      'rgba(' +
      Random.randomBetween(255) +
      ',' +
      Random.randomBetween(255) +
      ',' +
      Random.randomBetween(255) +
      ', 1)'
    );
  },

  randomHsla: function (): string {
    return (
      'hsla(' +
      Random.randomBetween(360) +
      ',' +
      Random.randomBetween(100) +
      '%,' +
      Random.randomBetween(100) +
      '%, 1)'
    );
  },
};

export default Random;
