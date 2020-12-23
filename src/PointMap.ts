import Point from './Point';

/**
 * Tracks a set of points,
 * such that two points with the same coordinates are the same
 */
export default class PointMap {
  private set = new Set<string>();

  add(point: Point): void {
    this.set.add(point.toString());
  }

  addCoord(x: number, y: number): void {
    this.add(new Point(x, y));
  }

  remove(point: Point): void {
    this.set.delete(point.toString());
  }

  removeCoord(x: number, y: number): void {
    this.remove(new Point(x, y));
  }

  clear(): void {
    this.set.clear();
  }

  /**
   * determines if point has been
   * added to map already
   *  @returns {Boolean}
   */
  exists(point: Point): boolean {
    return this.set.has(point.toString());
  }
}
