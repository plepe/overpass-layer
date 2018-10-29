class OverpassLayerPattern {
  constructor (def) {
    this.def = def
  }

  connect (layer) {
    this.layer = layer

    this.layer.on('update', this.processObject.bind(this))
  }

  processObject (object, data) {
    for (var k in data.features) {
      let def = k === 'default' ? data.data.style : data.data['style:' + k]

      if ('pattern' in def) {
        let symbol
        let pathOptions = {}
        let options = {}

        for (let k in def) {
          let m1 = k.match(/^pattern-path-(.*)$/)
          let m2 = k.match(/^pattern-(.*)$/)

          if (m1) {
            pathOptions[m1[1]] = def[k]
          } else if (m2) {
            options[m2[1]] = def[k]
          }
        }

        switch (def.pattern.toString()) {
          case 'arrowHead':
            options.pathOptions = pathOptions
            symbol = L.Symbol.arrowHead(options)
            break
          default:
            // TODO
        }

        options.symbol = symbol
        let pattern = L.polylineDecorator(data.features[k])
        pattern.addTo(this.layer.map)

        pattern.setPatterns([ options ])
      }
    }
  }
}

module.exports = OverpassLayerPattern
