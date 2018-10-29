class OverpassLayerPattern {
  constructor (def) {
    this.def = def
  }

  connect (layer) {
    this.layer = layer

    this.layer.on('update', this.processObject.bind(this))
  }

  processObject (object, data) {
  }
}

module.exports = OverpassLayerPattern
