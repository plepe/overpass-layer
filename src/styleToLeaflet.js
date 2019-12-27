const isTrue = require('./isTrue')

const transforms = {
  stroke: {
    type: 'boolean'
  },
  fill: {
    type: 'boolean'
  },
  textRepeat: {
    type: 'boolean'
  },
  textBelow: {
    type: 'boolean'
  },
  noClip: {
    type: 'boolean'
  },
  width: {
    rename: 'weight',
    type: 'length'
  },
  opacity: {
    type: 'float'
  },
  fillOpacity: {
    type: 'float'
  },
  offset: {
    type: 'length'
  }
}

function styleToLeaflet (style, twigData) {
  const ret = JSON.parse(JSON.stringify(style))

  for (let k in ret) {
    let value = ret[k]

    if (k in transforms) {
      const transform = transforms[k]

      switch (transform.type) {
        case 'boolean':
          value = isTrue(ret[k])
          break
        case 'float':
          value = parseFloat(ret[k])
          break
        case 'length':
          let m = ('' + ret[k]).trim().match(/^([+\-]?[0-9]+(?:\.[0-9]+)?)\s*(px|m)$/)
          if (m) {
            switch (m[2]) {
              case 'm':
                value = parseFloat(m[1]) / twigData.map.metersPerPixel
                break
              case 'px':
              default:
                value = parseFloat(m[1])
            }
          } else {
            value = parseFloat(ret[k])
          }
          break
      }

      if (transform.rename) {
        delete ret[k]
        k = transform.rename
      }
    }

    ret[k] = value
  }

  return ret
}

module.exports = styleToLeaflet
