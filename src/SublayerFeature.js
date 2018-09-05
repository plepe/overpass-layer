class SublayerFeature {
  constructor (object, sublayer) {
    this.object = object
    this.id = object.id
    this.sublayer = sublayer
    this.isShown = false
  }

  popupId () {
    if (!this.data.popupReplace) {
      return [ this.sublayer.options.sublayer_id, this.id ]
    }

    let popupReplaceLayer
    let popupReplaceId

    let m = this.data.popupReplace.split(/:/)
    if (m.length === 2) {
      popupReplaceLayer = m[0]
      popupReplaceId = m[1]
    } else {
      popupReplaceLayer = 'main'
      popupReplaceId = this.data.popupReplace.toString()
    }

    return [ popupReplaceLayer, popupReplaceId ]
  }

  popupIdString () {
    let [ popupReplaceLayer, popupReplaceId ] = this.popupId()

    return (popupReplaceLayer === 'main' ? '' : popupReplaceLayer + ':') + popupReplaceId
  }
}

module.exports = SublayerFeature
