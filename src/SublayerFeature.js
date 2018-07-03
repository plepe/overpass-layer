class SublayerFeature {
  constructor (object, sublayer) {
    this.object = object
    this.id = object.id
    this.sublayer = sublayer
    this.isShown = false
  }
}

module.exports = SublayerFeature
