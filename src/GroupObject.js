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
      features: Object.values(this.list).map(f => f.GeoJSON())
    }
  }

  intersects (bbox) {
    if (this.id === 'Urban-Loritz-Platz') {
      console.log('here')
    }

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

    Object.values(this.list).forEach(member => {
      feature.addLayer(member.object.leafletFeature(options))
    })

    this.leafletFeatures.push([feature, options])

    return feature
  }

  add (feature) {
    this.list[feature.id] = feature

    this.tags = {}
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

    this.meta = {}
    this.meta.ids = Object.values(this.list)
      .map(item => item.id)
      .join(';')

    this.leafletFeatures.forEach(([featureGroup, options]) => {
      featureGroup.addLayer(feature.object.leafletFeature(options))
    })
  }

  remove (feature) {
    delete this.list[feature.id]
  }
}

module.exports = GroupObject
