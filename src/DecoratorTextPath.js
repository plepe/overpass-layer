class DecoratorTextPath {
  constructor (layer) {
    this.layer = layer

    this.layer.on('update-style', this.processObjectStyle.bind(this))
  }

  getTransforms (transforms) {
    transforms.textRepeat = {
      type: 'boolean'
    }
    transforms.textBelow = {
      type: 'boolean'
    }
  }

  processObjectStyle (object, data, styleId, style) {
    if ('text' in style && 'setText' in data.features[styleId]) {
      data.features[styleId].setText(null)
      data.features[styleId].setText(style.text, {
        repeat: style.textRepeat,
        offset: style.textOffset,
        below: style.textBelow,
        attributes: {
          'fill': style.textFill,
          'fill-opacity': style.textFillOpacity,
          'font-weight': style.textFontWeight,
          'font-size': style.textFontSize,
          'letter-spacing': style.textLetterSpacing
        }
      })
    }
  }
}

module.exports = DecoratorTextPath
