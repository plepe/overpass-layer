const ee = require('event-emitter')

/**
 * Update event. Called, when the geometry of the bounding object changes.
 * @event BoundingObject#update
 * @type {object}
 */

/**
 * base class for bounding objects, e.g. map view
 * @fires BoundingObject#update
 */
class BoundingObject {
  constructor () {
  }

  /**
   * Returns the geometry of the bounding object.
   * @returns {BoundingBox|GeoJSON} Geometry of type BoundingBox or a GeoJSON feature.
   */
  get () {
  }
}

ee(BoundingObject.prototype)
module.exports = BoundingObject
