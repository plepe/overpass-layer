const styleToLeaflet = require('./styleToLeaflet')

class Sublayer {
  constructor (master, options) {
    this.master = master
    this.options = options

    this.visibleFeatures = {}
    this.shownFeatures = {} // features which are forcibly shown
    this.shownFeatureOptions = {}
    this.lastZoom = null
  }

  addTo (map) {
    this.map = map
  }

  startAdding () {
    this.currentRequestFeatures = {}
  }

  add (ob) {
    this.currentRequestFeatures[ob.id] = true

    if (!(ob.id in this.visibleFeatures)) {
      var data = {
        object: ob,
        isShown: false
      }

      if (ob.id in this.shownFeatures) {
        data = this.shownFeatures[ob.id]
      } else {
        this._processObject(data)

        this._show(data)
      }

      this.visibleFeatures[ob.id] = data

      if (this.master.layerList) {
        this.master.layerList.addObject(data)
      }
      if (this.master.onAppear) {
        this.master.onAppear(data)
      }
    }
  }

  finishAdding () {
    for (var k in this.visibleFeatures) {
      if (!(k in this.currentRequestFeatures)) {
        if (!(k in this.shownFeatures)) {
          this._hide(this.visibleFeatures[k])
        }

        if (this.master.layerList) {
          this.master.layerList.delObject(this.visibleFeatures[k])
        }
        if (this.master.onDisappear) {
          this.master.onDisappear(this.visibleFeatures[k])
        }

        delete this.visibleFeatures[k]
      }
    }
  }

  hideAll () {
    for (let k in this.visibleFeatures) {
      ob = this.visibleFeatures[k]

      if (this.layerList) {
        this.layerList.delObject(ob)
      }
      if (this.onDisappear) {
        this.onDisappear(ob)
      }

      if (!(ob.id in this.shownFeatures)) {
        this._hide(ob)
      }
    }

    this.visibleFeatures = {}
  }

  // Hide loaded but non-visible objects
  hideNonVisible (bounds) {
    for (let k in this.visibleFeatures) {
      let ob = this.visibleFeatures[k]

      if (!ob.object.intersects(bounds)) {
        if (this.layerList) {
          this.layerList.delObject(ob)
        }
        if (this.onDisappear) {
          this.onDisappear(ob)
        }

        if (!(ob.id in this.shownFeatures)) {
          this._hide(ob)
        }

        delete this.visibleFeatures[k]
      }
    }
  }

  zoomChange () {
    this.recalc()

    for (let k in this.visibleFeatures) {
      if (this.master.onZoomChange) {
        this.master.onZoomChange(this.visibleFeatures[k])
      }
    }

    this.lastZoom = this.map.getZoom()
  }

  recalc () {
    for (var k in this.visibleFeatures) {
      this._processObject(this.visibleFeatures[k])
    }
  }

  _processObject (data) {
    var k
    var ob = data.object
    var showOptions = {
      styles: []
    }

    delete this.master._scheduledReprocesses[data.id]

    if (ob.id in this.shownFeatureOptions) {
      this.shownFeatureOptions[ob.id].forEach(function (opt) {
        if ('styles' in opt) {
          showOptions.styles = showOptions.styles.concat(opt.styles)
        }
      })
    }

    var objectData = this.evaluate(data)

    for (k in objectData) {
      var m = k.match(/^style(|:(.*))$/)
      if (m) {
        var styleId = typeof m[2] === 'undefined' ? 'default' : m[2]
        var style = styleToLeaflet(objectData[k])

        if (data.features[styleId]) {
          data.features[styleId].setStyle(style)
        } else {
          data.features[styleId] = ob.leafletFeature(style)
        }

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

        if ('offset' in style && 'setOffset' in data.features[styleId]) {
          data.features[styleId].setOffset(style.offset)
        }
      }
    }

    if ('styles' in showOptions) {
      objectData.styles = objectData.styles.concat(showOptions.styles)
    }

    objectData.marker = {
      html: '',
      iconAnchor: [ 0, 0 ],
      iconSize: [ 0, 0 ],
      signAnchor: [ 0, 0 ],
      popupAnchor: [ 0, 0 ]
    }
    if (objectData.markerSymbol) {
      objectData.marker.html += objectData.markerSymbol

      var div = document.createElement('div')
      div.innerHTML = objectData.markerSymbol

      if (div.firstChild) {
        var c = div.firstChild

        objectData.marker.iconSize = [ c.offsetWidth, c.offsetHeight ]
        if (c.hasAttribute('width')) {
          objectData.marker.iconSize[0] = parseFloat(c.getAttribute('width'))
        }
        if (c.hasAttribute('height')) {
          objectData.marker.iconSize[1] = parseFloat(c.getAttribute('height'))
        }

        objectData.marker.iconAnchor = [ objectData.marker.iconSize[0] / 2, objectData.marker.iconSize[1] / 2 ]
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
    }

    if (objectData.markerSign) {
      let x = objectData.marker.iconAnchor[0] + objectData.marker.signAnchor[0]
      let y = -objectData.marker.iconSize[1] + objectData.marker.iconAnchor[1] + objectData.marker.signAnchor[1]
      objectData.marker.html += '<div class="sign" style="margin-left: ' + x + 'px; margin-top: ' + y + 'px;">' + objectData.markerSign + '</div>'
    }

    if (objectData.marker.html) {
      objectData.marker.className = 'overpass-layer-icon'
      var icon = L.divIcon(objectData.marker)

      if (data.featureMarker) {
        data.featureMarker.setIcon(icon)
        if (data.featureMarker._icon) {
          this.updateAssets(data.featureMarker._icon)
        }
      } else {
        data.featureMarker = L.marker(ob.center, { icon: icon })
      }
    }

    if (data.isShown) {
      for (k in data.features) {
        if (objectData.styles.indexOf(k) !== -1 && data.styles.indexOf(k) === -1) {
          data.features[k].addTo(this.map)
        }
        if (objectData.styles.indexOf(k) === -1 && data.styles.indexOf(k) !== -1) {
          this.map.removeLayer(data.features[k])
        }
      }
    }
    data.styles = objectData.styles

    data.feature = data.styles.length
      ? data.features[data.styles[0]]
      : null

    var popupContent = ''
    popupContent += '<h1>' + objectData.title + '</h1>'
    popupContent += objectData.body

    if ('updateAssets' in this.options) {
      let div = document.createElement('div')
      div.innerHTML = popupContent
      this.updateAssets(div, objectData)
      popupContent = div.innerHTML
    }

    if (data.popup) {
      if (data.popup._contentNode) {
        data.popup._contentNode.innerHTML = popupContent
      } else {
        data.popup = data.popup.setContent(popupContent)
      }
    } else {
      data.popup = L.popup().setContent(popupContent)
      data.popup.object = data

      for (k in data.features) {
        if (this._shallBindPopupToStyle(k)) {
          data.features[k].bindPopup(data.popup)
        }
      }

      if (data.featureMarker) {
        data.featureMarker.bindPopup(data.popup)
      }
    }

    data.id = ob.id
    data.layer_id = this.options.id
    data.data = objectData

    if (this.layerList) {
      this.layerList.updateObject(data)
    }
    if (this.onUpdate) {
      this.onUpdate(data)
    }
  }

  evaluate (data) {
    var k
    var ob = data.object

    var twigData = this.twigData(ob)

    var objectData = {}
    for (k in this.options.feature) {
      if (typeof this.options.feature[k] === 'function') {
        objectData[k] = this.options.feature[k](twigData)
      } else {
        objectData[k] = this.options.feature[k]
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

        if (this.options.stylesNoAutoShow.indexOf(styleId) === -1) {
          styleIds.push(styleId)
        }
      }
    }

    if (!('features' in data)) {
      data.features = {}
    }

    objectData.styles =
      'styles' in objectData ? objectData.styles
        : 'styles' in this.options ? this.options.styles
          : styleIds
    if (typeof objectData.styles === 'string' || 'twig_markup' in objectData.styles) {
      var styles = objectData.styles.trim()
      if (styles === '') {
        objectData.styles = []
      } else {
        objectData.styles = styles.split(/,/)
      }
    }

    return objectData
  }

  twigData (ob) {
    var result = {
      id: ob.id,
      layer_id: this.options.id,
      osm_id: ob.osm_id,
      type: ob.type,
      tags: ob.tags,
      meta: ob.meta,
      'const': this.options.const
    }

    if (this.map) {
      result.map = {
        zoom: this.map.getZoom()
      }
    }

    return result
  }

  _shallBindPopupToStyle (styleId) {
    return this.options.styleNoBindPopup.indexOf(styleId) === -1
  }

  _show (data) {
    if (!this.map) {
      return
    }

    for (var i = 0; i < data.styles.length; i++) {
      var k = data.styles[i]
      if (k in data.features) {
        data.features[k].addTo(this.map)
      }
    }

    data.feature = data.styles.length
      ? data.features[data.styles[0]]
      : null

    if (data.featureMarker) {
      data.featureMarker.addTo(this.map)
      this.updateAssets(data.featureMarker._icon)
    }

    data.isShown = true
  }

  _hide (data) {
    for (var k in data.features) {
      this.map.removeLayer(data.features[k])
    }

    if (data.featureMarker) {
      this.map.removeLayer(data.featureMarker)
    }

    data.isShown = false
  }

}

module.exports = Sublayer
