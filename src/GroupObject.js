const ee = require('event-emitter')

class GroupObject {
  constructor (id) {
    this.id = id
    this.properties = 0
    this.list = {}
    this.leafletFeatures = []
  }

  memberIds () {
  }

  title () {
    return this.id
  }

  GeoJSON () {
    return {
      type: 'FeatureCollection',
      id: this.id,
      properties: {},
      features: Object.values(this.list).map(f => f.object.GeoJSON())
    }
  }

  intersects (bbox) {
    let max = 0

    for (let k in this.list) {
      const i = this.list[k].object.intersects(bbox)

      if (i === 2) {
        return 2
      }

      max = i > max ? i : max
    }

    return max
  }

  leafletFeature (options) {
    if (!('shiftWorld' in options)) {
      options.shiftWorld = [0, 0]
    }

    const feature = L.featureGroup()
    feature._updateCallbacks = []

    const mapping = {}
    Object.values(this.list).forEach(member => {
      const layer = feature.addLayer(member.object.leafletFeature(options))
      mapping[member.id] = feature.getLayerId(layer)
    })

    this.leafletFeatures.push([feature, options, mapping])

    return feature
  }

  add (feature) {
    this.list[feature.id] = feature

    this.recalc()

    this.leafletFeatures.forEach(([featureGroup, options, mapping]) => {
      const layer = featureGroup.addLayer(feature.object.leafletFeature(options))
      mapping[feature.id] = featureGroup.getLayerId(layer)
    })
  }

  remove (feature) {
    delete this.list[feature.id]

    this.recalc()

    this.leafletFeatures.forEach(([featureGroup, options, mapping]) => {
      featureGroup.removeLayer(mapping[feature.id])
      delete mapping[feature.id]
    })
  }

  recalc () {
    if (!this.meta) {
      this.meta = {}
      this.tags = {}
    }

    this.meta.ids = Object.values(this.list)
      .map(item => item.id)
      .join(';')

    for (let k in this.tags) {
      delete this.tags[k]
    }

    Object.values(this.list).forEach(item => {
      for (let k in item.object.tags) {
        if (!(k in this.tags)) {
          this.tags[k] = {}
        }
        let values = item.object.tags[k].split(/;/g)
        values.forEach(v => {
          this.tags[k][v] = true
        })
      }
    })

    for (let k in this.tags) {
      this.tags[k] = Object.keys(this.tags[k]).join(';')
    }
  }
}

ee(GroupObject.prototype)

module.exports = GroupObject
