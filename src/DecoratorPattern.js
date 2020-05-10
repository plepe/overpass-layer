/* global L */

const isTrue = require('./isTrue')
const styleToLeaflet = require('./styleToLeaflet')
const parseLength = require('./parseLength')

class DecoratorPattern {
  constructor (layer) {
    this.layer = layer

    if (L.polylineDecorator) {
      this.layer.on('update', this.processObject.bind(this))
      this.layer.on('remove', this.removeObject.bind(this))
    }
  }

  parseType (key, value, twigData) {
    switch (key) {
      case 'polygon':
      case 'rotate':
        return isTrue(value)
      case 'pixelSize':
      case 'repeat':
      case 'offset':
      case 'endOffset':
      case 'lineOffset':
        return parseLength(value, twigData.map.metersPerPixel)
      case 'angleCorrection':
      case 'headAngle':
        return parseFloat(value)
      default:
        return value
    }
  }

  parsePatterns (def, data) {
    const result = {}

    for (const k in def) {
      const m = k.match(/^pattern([^-]*)$/)
      if (m) {
        result[m[1]] = {
          type: def[k],
          options: {},
          symbolOptions: {}
        }
      }
    }

    for (const k in def) {
      const m1 = k.match(/^pattern([^-]*)-path-(.*)$/)
      const m2 = k.match(/^pattern([^-]*)-(.*)$/)

      if (m1) {
        result[m1[1]].symbolOptions[m1[2]] = def[k]
      } else if (m2) {
        result[m2[1]].options[m2[2]] = this.parseType(m2[2], def[k], data.twigData)
      }
    }

    return result
  }

  processObject (object, data) {
    if (!data.patternFeatures) {
      data.patternFeatures = {}
    }

    for (var k in data.features) {
      const def = k === 'default' ? data.data.style : data.data['style:' + k]

      if (data.styles.includes(k)) {
        let patternDefs = this.parsePatterns(def, data)
        console.log(patternDefs)

        const patternIds = Object.keys(patternDefs)
        const patterns = []
        patternIds.forEach(patternId => {
          let symbol
          let {type, options, symbolOptions} = patternDefs[patternId]

          switch (type) {
            case 'dash':
              options.pathOptions = styleToLeaflet(symbolOptions, data.twigData)
              symbol = L.Symbol.dash(options)
              break
            case 'arrowHead':
              options.pathOptions = styleToLeaflet(symbolOptions, data.twigData)
              symbol = L.Symbol.arrowHead(options)
              break
            case 'marker':
              options.markerOptions = symbolOptions
              symbol = L.Symbol.marker(options)
              break
            default:
              // TODO
          }

          if (symbol) {
            options.symbol = symbol
            patterns.push(options)
          }
        })

        if (!data.patternFeatures[k]) {
          data.patternFeatures[k] = L.polylineDecorator(data.features[k])
          data.patternFeatures[k].addTo(this.layer.map)
        }

        data.patternFeatures[k].setPatterns(patterns)

        if (this.layer._shallBindPopupToStyle(k)) {
          data.patternFeatures[k].bindPopup(data.popup)
        }
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

module.exports = DecoratorPattern
