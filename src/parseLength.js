module.exports = function parseLength (value, metersPerPixel) {
  const m = ('' + value).trim().match(/^([+-]?[0-9]+(?:\.[0-9]+)?)\s*(px|m)$/)
  if (m) {
    switch (m[2]) {
      case 'm':
        return parseFloat(m[1]) / metersPerPixel
      case 'px':
      default:
        return parseFloat(m[1])
    }
  }

  return parseFloat(value)
}
