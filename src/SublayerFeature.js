const styleToLeaflet = require('./styleToLeaflet')
const pointOnFeature = require('./pointOnFeature')

class SublayerFeature {
  constructor (object, sublayer) {
    this.object = object
    this.id = object.id
    this.sublayer = sublayer
    this.master = sublayer.master
    this.isShown = false
    this.flags = {}
  }

  updateFlags () {
    const shownFeatureOptions = this.sublayer.shownFeatureOptions[this.id]

    this.flags = {}
    shownFeatureOptions.forEach(options => {
      if (options.flags) {
        options.flags.forEach(flag => {
          this.flags[flag] = true
        })
      }
    })
  }

  _processObject () {
    let k
    let showOptions = {
      styles: []
    }
    const leafletFeatureOptions = {
      shiftWorld: this.master.getShiftWorld()
    }

    if (this.id in this.sublayer.shownFeatureOptions) {
      this.sublayer.shownFeatureOptions[this.id].forEach(function (opt) {
        if ('styles' in opt) {
          showOptions.styles = showOptions.styles.concat(opt.styles)
        }
      })
    }

    var objectData = this.evaluate()

    if (!this.feature) {
      this.feature = this.object.leafletFeature(Object.assign({
        weight: 0,
        opacity: 0,
        fillOpacity: 0,
        radius: 0
      }, leafletFeatureOptions))
    }

    for (k in objectData) {
      var m = k.match(/^style(|:(.*))$/)
      if (m) {
        var styleId = typeof m[2] === 'undefined' ? 'default' : m[2]
        var style = styleToLeaflet(objectData[k], this.master.globalTwigData)

        if (this.features[styleId]) {
          this.features[styleId].setStyle(style)
        } else {
          this.features[styleId] = this.object.leafletFeature(Object.assign(style, leafletFeatureOptions))
        }

        if ('text' in style && 'setText' in this.features[styleId]) {
          this.features[styleId].setText(null)
          this.features[styleId].setText(style.text, {
            repeat: style.textRepeat,
            offset: style.textOffset,
            below: style.textBelow,
            attributes: {
              fill: style.textFill,
              'fill-opacity': style.textFillOpacity,
              'font-weight': style.textFontWeight,
              'font-size': style.textFontSize,
              'letter-spacing': style.textLetterSpacing
            }
          })
        }

        if ('offset' in style && 'setOffset' in this.features[styleId]) {
          this.features[styleId].setOffset(style.offset)
        }
      }
    }

    if ('styles' in showOptions) {
      objectData.styles = objectData.styles.concat(showOptions.styles)
    }

    objectData.marker = {
      html: '',
      iconAnchor: [0, 0],
      iconSize: [0, 0],
      signAnchor: [0, 0],
      popupAnchor: [0, 0]
    }
    if (objectData.markerSymbol) {
      objectData.marker.html += objectData.markerSymbol

      var div = document.createElement('div')
      div.innerHTML = objectData.markerSymbol

      if (div.firstChild) {
        var c = div.firstChild

        objectData.marker.iconSize = [c.offsetWidth, c.offsetHeight]
        if (c.hasAttribute('width')) {
          objectData.marker.iconSize[0] = parseFloat(c.getAttribute('width'))
        }
        if (c.hasAttribute('height')) {
          objectData.marker.iconSize[1] = parseFloat(c.getAttribute('height'))
        }

        objectData.marker.iconAnchor = [objectData.marker.iconSize[0] / 2, objectData.marker.iconSize[1] / 2]
        if (c.hasAttribute('anchorx')) {
          objectData.marker.iconAnchor[0] = parseFloat(c.getAttribute('anchorx'))
        }
        if (c.hasAttribute('anchory')) {
          objectData.marker.iconAnchor[1] = parseFloat(c.getAttribute('anchory'))
        }

        if (c.hasAttribute('signanchorx')) {
          objectData.marker.signAnchor[0] = parseFloat(c.getAttribute('signanchorx'))
        }
        if (c.hasAttribute('signanchory')) {
          objectData.marker.signAnchor[1] = parseFloat(c.getAttribute('signanchory'))
        }

        if (c.hasAttribute('popupanchory')) {
          objectData.marker.popupAnchor[0] = parseFloat(c.getAttribute('popupanchorx'))
        }
        if (c.hasAttribute('popupanchory')) {
          objectData.marker.popupAnchor[1] = parseFloat(c.getAttribute('popupanchory'))
        }
      }

      this.sublayer.updateAssets(div, objectData)
    }

    if (objectData.markerSign) {
      const x = objectData.marker.iconAnchor[0] + objectData.marker.signAnchor[0]
      const y = -objectData.marker.iconSize[1] + objectData.marker.iconAnchor[1] + objectData.marker.signAnchor[1]
      objectData.marker.html += '<div class="sign" style="margin-left: ' + x + 'px; margin-top: ' + y + 'px;">' + objectData.markerSign + '</div>'
    }

    if (objectData.marker.html) {
      objectData.marker.className = 'overpass-layer-icon'
      var icon = L.divIcon(objectData.marker)

      if (this.featureMarker) {
        this.featureMarker.setIcon(icon)
        if (this.featureMarker._icon) {
          this.sublayer.updateAssets(this.featureMarker._icon)
        }
      } else {
        if (!this.pointOnFeature) {
          this.pointOnFeature = pointOnFeature(this.object, leafletFeatureOptions)
        }

        this.featureMarker = L.marker(this.pointOnFeature, { icon: icon })
      }
    }

    if (this.isShown) {
      this.feature.addTo(this.map)
      for (k in this.features) {
        if (objectData.styles && objectData.styles.indexOf(k) !== -1 && data.styles && data.styles.indexOf(k) === -1) {
          this.features[k].addTo(this.map)
        }
        if (objectData.styles && objectData.styles.indexOf(k) === -1 && data.styles && data.styles.indexOf(k) !== -1) {
          this.map.removeLayer(this.features[k])
        }
      }
    }
    this.styles = objectData.styles

    this.layouts = {}
    for (let k in this.sublayer.options.layouts) {
      if (typeof this.sublayer.options.layouts[k] === 'function') {
        this.layouts[k] = this.sublayer.options.layouts[k]({object: objectData})
      } else {
        this.layouts[k] = this.sublayer.options.layouts[k]
      }
    }

    var popupContent = this.layouts.popup

    if (this.popup) {
      if (this.popup._contentNode) {
        if (this.popup.currentHTML !== popupContent) {
          this.popup._contentNode.innerHTML = popupContent
          this.sublayer.updateAssets(this.popup._contentNode, objectData)
        }
      } else {
        this.popup.setContent(popupContent)
      }

      this.popup.currentHTML = popupContent
    } else {
      this.popup = L.popup().setContent(popupContent)
      this.popup.feature = this
      this.popup.sublayer = this

      this.feature.bindPopup(this.popup)
      for (k in this.features) {
        if (this.sublayer._shallBindPopupToStyle(k)) {
          this.features[k].bindPopup(this.popup)
        }
      }

      if (this.featureMarker) {
        this.featureMarker.bindPopup(this.popup)
      }
    }

    this.layer_id = this.sublayer.options.id
    this.sublayer_id = this.sublayer.options.sublayer_id
    this.data = objectData

    if (this.master.onUpdate) {
      this.master.onUpdate(this)
    }

    this.master.emit('update', this.object, this)
    this.sublayer.emit('update', this.object, this)
  }

  twigData () {
    let ob = this.object
    var result = {
      id: this.id,
      sublayer_id: this.sublayer.options.sublayer_id,
      osm_id: ob.osm_id,
      type: ob.type,
      tags: ob.tags,
      meta: ob.meta,
      flags: this.flags,
      members: [],
      const: this.sublayer.options.const
    }

    if (ob.memberFeatures) {
      ob.memberFeatures.forEach((member, sequence) => {
        const r = {
          id: member.id,
          sequence,
          type: member.type,
          osm_id: member.osm_id,
          role: ob.members[sequence].role,
          tags: member.tags,
          meta: member.meta,
          dir: member.dir,
          connectedPrev: member.connectedPrev,
          connectedNext: member.connectedNext
        }

        result.members.push(r)
      })
    }

    for (const k in this.master.globalTwigData) {
      result[k] = this.master.globalTwigData[k]
    }

    this.sublayer.emit('twigData', this.object, this, result)
    this.master.emit('twigData', this.object, this, result)

    return result
  }

  evaluate () {
    var k
    var ob = this.object

    let twigData = this.twigData()

    var objectData = {}
    for (k in this.sublayer.options.feature) {
      if (typeof this.sublayer.options.feature[k] === 'function') {
        objectData[k] = this.sublayer.options.feature[k](twigData)
      } else {
        objectData[k] = this.sublayer.options.feature[k]
      }
    }

    var styleIds = []
    for (k in objectData) {
      var m = k.match(/^style(|:(.*))$/)
      if (m) {
        var style = objectData[k]
        var styleId = typeof m[2] === 'undefined' ? 'default' : m[2]

        if (typeof style === 'string' || 'twig_markup' in style) {
          objectData[k] = strToStyle(style)
        }

        if (this.sublayer.options.stylesNoAutoShow.indexOf(styleId) === -1) {
          styleIds.push(styleId)
        }
      }
    }

    if (!('features' in this)) {
      this.features = {}
    }

    objectData.styles =
      'styles' in objectData ? objectData.styles
        : 'styles' in this.sublayer.options ? this.sublayer.options.styles
          : styleIds
    if (typeof objectData.styles === 'string' || 'twig_markup' in objectData.styles) {
      var styles = objectData.styles.trim()
      if (styles === '') {
        objectData.styles = []
      } else {
        objectData.styles = styles.split(/,/).map(style => style.trim())
      }
    }

    return objectData
  }

  _show () {
    if (!this.map) {
      return
    }

    this.feature.addTo(this.sublayer.map)
    for (var i = 0; i < data.styles.length; i++) {
      var k = data.styles[i]
      if (k in data.features) {
        this.features[k].addTo(this.sublayer.map)
      }
    }

    if (this.featureMarker) {
      this.featureMarker.addTo(this.sublayer.map)
      this.sublayer.updateAssets(this.featureMarker._icon)
    }

    this.object.on('update', this.sublayer.scheduleReprocess.bind(this.sublayer, this.id))

    this.isShown = true
  }

  _hide () {
    this.master.emit('remove', this.object, this)
    this.sublayer.emit('remove', this.object, this)

    this.sublayer.map.removeLayer(this.feature)
    for (var k in this.features) {
      this.sublayer.map.removeLayer(this.features[k])
    }

    if (this.featureMarker) {
      this.sublayer.map.removeLayer(this.featureMarker)
    }

    if (this.master.onDisappear) {
      this.master.onDisappear(this)
    }

    this.object.off('update', this.sublayer.scheduleReprocess.bind(this.sublayer, this.id))

    this.isShown = false
  }

}

module.exports = SublayerFeature
