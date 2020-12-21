import Point from './point';

/**
 * Represents a point
 * @class
 */
export default class PointMap {
  private _map: { [point: string]: boolean } = {};

  // adds point to map
  add(point: Point): void {
    this._map[point.toString()] = true;
  }

  // adds x, y coord to map
  addCoord(x: number, y: number): void {
    this.add(new Point(x, y));
  }

  // removes point from map
  remove(point: Point): void {
    this._map[point.toString()] = false;
  }

  // removes x, y coord from map
  removeCoord(x: number, y: number): void {
    this.remove(new Point(x, y));
  }

  // clears the map
  clear(): void {
    this._map = {};
  }

  /**
   * determines if point has been
   * added to map already
   *  @returns {Boolean}
   */
  exists(point: Point): boolean {
    return this._map[point.toString()] ? true : false;
  }
}
