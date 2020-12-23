import Point from '../Point';

/**
 * returns a function for random numbers with pre-set max and min
 */
export function randomNumberFunction(max: number, min = 0): () => number {
  if (min > max) {
    const temp = max;
    max = min;
    min = temp;
  }
  // hey look a closure
  return function () {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
}

/**
 * returns a random integer between the max and min
 */
export function randomBetween(max: number, min = 0): number {
  return randomNumberFunction(max, min)();
}

export function randomInCircle(radius: number, ox: number, oy: number): Point {
  const angle = Math.random() * Math.PI * 2;
  const rad = Math.sqrt(Math.random()) * radius;
  const x = ox + rad * Math.cos(angle);
  const y = oy + rad * Math.sin(angle);

  return new Point(x, y);
}

export function randomRgb(): string {
  return (
    'rgb(' +
    randomBetween(255) +
    ',' +
    randomBetween(255) +
    ',' +
    randomBetween(255) +
    ')'
  );
}

export function randomRgba(): string {
  return (
    'rgba(' +
    randomBetween(255) +
    ',' +
    randomBetween(255) +
    ',' +
    randomBetween(255) +
    ', 1)'
  );
}

export function randomHsla(): string {
  return (
    'hsla(' +
    randomBetween(360) +
    ',' +
    randomBetween(100) +
    '%,' +
    randomBetween(100) +
    '%, 1)'
  );
}

export function randomHex(): string {
  return (
    '#' +
    ('00000' + randomBetween(parseInt('ffffff', 16)).toString(16)).slice(-6)
  );
}
