class OverpassLayerPattern {
  constructor (def) {
    this.def = def
  }

  connect (layer) {
    this.layer = layer

    this.layer.on('update', this.processObject.bind(this))
    this.layer.on('remove', this.removeObject.bind(this))
  }

  processObject (object, data) {
    if (!data.patternFeatures) {
      data.patternFeatures = {}
    }

    for (var k in data.features) {
      let def = k === 'default' ? data.data.style : data.data['style:' + k]

      if (def.pattern && data.styles.includes(k)) {
        let symbol
        let symbolOptions = {}
        let options = {}

        for (let k in def) {
          let m1 = k.match(/^pattern-path-(.*)$/)
          let m2 = k.match(/^pattern-(.*)$/)

          if (m1) {
            symbolOptions[m1[1]] = def[k]
          } else if (m2) {
            options[m2[1]] = def[k]
          }
        }

        switch (def.pattern.toString()) {
          case 'dash':
            options.pathOptions = symbolOptions
            symbol = L.Symbol.dash(options)
            break
          case 'arrowHead':
            options.pathOptions = symbolOptions
            symbol = L.Symbol.arrowHead(options)
            break
          case 'marker':
            options.markerOptions = symbolOptions
            symbol = L.Symbol.marker(options)
            break
          default:
            // TODO
        }

        options.symbol = symbol

        if (!data.patternFeatures[k]) {
          data.patternFeatures[k] = L.polylineDecorator(data.features[k])
          data.patternFeatures[k].addTo(this.layer.map)
        }

        data.patternFeatures[k].setPatterns([ options ])
      } else {
        if (data.patternFeatures[k]) {
          this.layer.map.removeLayer(data.patternFeatures[k])
          delete data.patternFeatures[k]
        }
      }
    }
  }

  removeObject (object, data) {
    if (!data.patternFeatures) {
      return
    }

    for (var k in data.features) {
      if (data.patternFeatures[k]) {
        this.layer.map.removeLayer(data.patternFeatures[k])
        delete data.patternFeatures[k]
      }
    }
  }
}

module.exports = OverpassLayerPattern
