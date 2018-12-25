const isTrue = require('./isTrue')

function styleToLeaflet (style, transforms) {
  let ret = JSON.parse(JSON.stringify(style))

  for (let k in ret) {
    let value = ret[k]

    if (k in transforms) {
      let transform = transforms[k]

      switch (transform.type) {
        case 'boolean':
          value = isTrue(ret[k])
          break
        case 'float':
          value = parseFloat(ret[k])
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
