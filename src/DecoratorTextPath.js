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
      data.features[styleId].setText(style.text, {
        repeat: style.textRepeat,
        offset: style.textOffset,
        below: style.textBelow,
        orientation: style.textOrientation,
        allowCrop: false,
        center: style.textCenter,
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
