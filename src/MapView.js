const BoundingBox = require('boundingbox')

const BoundingObject = require('./BoundingObject')

class MapView extends BoundingObject {
  constructor (map) {
    super()

    this.map = map
    this._updateFun = this.update.bind(this)
    this.map.on('moveend', this._updateFun)
  }

  update (e) {
    this.emit('update', e)
  }

  get () {
    return new BoundingBox(this.map.getBounds())
  }

  remove () {
    this.map.off('moveend', this._updateFun)
    delete this.map
  }
}

module.exports = MapView
