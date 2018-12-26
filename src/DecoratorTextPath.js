function node2textpath (dom) {
  if (dom.nodeType === 3) {
    return dom.textContent
  }

  if (dom.nodeType !== 1) {
    return ''
  }

  let ret = { text: [] }
  for (let i = 0; i < dom.attributes.length; i++) {
    let attr = dom.attributes.item(i)
    ret[attr.name] = attr.value
  }

  let current = dom.firstChild
  while (current) {
    ret.text.push(node2textpath(current))
    current = current.nextSibling
  }

  return ret
}

function html2textpath (str) {
  if (typeof str !== 'string') {
    return str
  }

  let ret = []
  let div = document.createElement('div')
  div.innerHTML = str

  let current = div.firstChild
  while (current) {
    ret.push(node2textpath(current))
    current = current.nextSibling
  }

  return ret
}

class DecoratorTextPath {
  constructor (layer) {
    this.layer = layer

    this.layer.on('update-style', this.processObjectStyle.bind(this))
  }

  getTransforms (transforms) {
    transforms.textBelow = {
      type: 'boolean'
    }
  }

  processObjectStyle (object, data, styleId, style) {
    if ('text' in style && 'setText' in data.features[styleId]) {
      data.features[styleId].setText(null)
      data.features[styleId].setText(html2textpath(style.text), {
        repeat: style.textRepeat,
        offset: style.textOffset,
        below: style.textBelow,
        orientation: style.textOrientation,
        allowCrop: false,
        center: style.textCenter,
        turnedText: html2textpath(style.textTurned),
        attributes: {
          'fill': style.textFill,
          'fill-opacity': style.textFillOpacity,
          'font-weight': style.textFontWeight,
          // Browser support for non-monospace fonts on rotated texts is bad.
          // see https://xover.mud.at/~skunk/svg-rotate-glyph/ for a comparison.
          'font-family': style.textFontFamily || (style.textOrientation === 'auto' ? 'monospace' : 'sans'),
          'font-size': style.textFontSize,
          'letter-spacing': style.textLetterSpacing,
          'dominant-baseline': 'middle'
        }
      })
    }
  }
}

module.exports = DecoratorTextPath
