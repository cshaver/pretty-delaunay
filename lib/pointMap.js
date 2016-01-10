var PointMap;

(function() {
  'use strict';

  var Point = Point || require('./point');

  /**
   * Represents a point
   * @class
   */
  class _PointMap {
    constructor() {
      this._map = {};
    }

    // adds point to map
    add(point) {
      this._map[point.toString()] = true;
    }

    // adds x, y coord to map
    addCoord(x, y) {
      this.add(new Point(x, y));
    }

    // removes point from map
    remove(point) {
      this._map[point.toString()] = false;
    }

    // removes x, y coord from map
    removeCoord(x, y) {
      this.remove(new Point(x, y));
    }

    // clears the map
    clear() {
      this._map = {};
    }

    /**
     * determines if point has been
     * added to map already
     *  @returns {Boolean}
     */
    exists(point) {
      return this._map[point.toString()] ? true : false;
    }
  }

  if (typeof module !== 'undefined') {
    module.exports = _PointMap;
  }

  PointMap = _PointMap;
})();
