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
    rename: 'weight'
  }
}

function styleToLeaflet (style) {
  let ret = JSON.parse(JSON.stringify(style))

  for (let k in ret) {
    let value =  ret[k]

    if (k in transforms) {
      let transform = transforms[k]

      switch (transform.type) {
        case 'boolean':
          value = isTrue(ret[k])
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
