/* global L */

const ee = require('event-emitter')
const OverpassFrontend = require('overpass-frontend')
const nearestPointOnGeometry = require('nearest-point-on-geometry')
const BoundingBox = require('boundingbox')

const styleToLeaflet = require('./styleToLeaflet')
const strToStyle = require('./strToStyle')
const SublayerFeature = require('./SublayerFeature')

// Extensions:
const decorators = [
  require('./DecoratorPattern')
]

class Sublayer {
  constructor (master, options) {
    this.master = master

    options.sublayer_id = options.sublayer_id || 'main'
    this.options = options

    this.visibleFeatures = {}
    this.shownFeatures = {} // features which are forcibly shown
    this.shownFeatureOptions = {}
    this.lastZoom = null
    this._scheduledReprocesses = {}

    if (!options.feature['style:hover']) {
      options.feature['style:hover'] = {
        color: 'black',
        width: 3,
        opacity: 1,
        radius: 12,
        pane: 'hover'
      }
    }

    if (options.styleNoBindPopup) {
      options.styleNoBindPopup.push('hover')
    } else {
      options.styleNoBindPopup = ['hover']
    }
    if (options.stylesNoAutoShow) {
      options.stylesNoAutoShow.push('hover')
    } else {
      options.stylesNoAutoShow = ['hover']
    }

    decorators.forEach(Ext => new Ext(this))
  }

  addTo (map) {
    this.map = map

    this.map.on('popupopen', this._popupOpen.bind(this))
  }

  _popupOpen (e) {
    if (e.popup.sublayer === this) {
      this.updateAssets(e.popup._contentNode)
    }
  }

  domUpdateHooks (node) {
    if (node.getAttribute) {
      const id = node.getAttribute('data-object')

      if (id) {
        const sublayerId = node.getAttribute('data-sublayer') || 'main'
        node.classList.add('hoverable')

        // check if referenced object is loaded - if not, request load
        const ofOptions = {
          properties: OverpassFrontend.ALL
        }
        const subObject = this.master.overpassFrontend.getCached(id, ofOptions)

        if (!subObject) {
          this.master.overpassFrontend.get(id, ofOptions,
            () => {},
            () => {}
          )
        }

        node.onmouseover = () => {
          if (this.currentHover) {
            this.currentHover.hide()
          }

          this.currentHover = this.master.subLayers[sublayerId].show(id, { styles: ['hover'] }, function () {})
        }
        node.onmouseout = () => {
          if (this.currentHover) {
            this.currentHover.hide()
          }

          this.currentHover = null
        }
        node.onclick = () => {
          if (this.currentHover) {
            this.currentHover.hide()
          }

          this.master.subLayers[sublayerId].openPopupOnObject(id)
        }
      }
    }

    let child = node.firstChild
    while (child) {
      this.domUpdateHooks(child)
      child = child.nextSibling
    }
  }

  remove () {
    this.map.off('popupopen', this._popupOpen.bind(this))

    this.map = null
  }

  startAdding () {
    this.currentRequestFeatures = {}
  }

  add (ob) {
    this.currentRequestFeatures[ob.id] = true

    if (!(ob.id in this.visibleFeatures)) {
      var data = new SublayerFeature(ob, this)

      if (ob.id in this.shownFeatures) {
        data = this.shownFeatures[ob.id]
      } else {
        this._processObject(data)

        this._show(data)
      }

      this.visibleFeatures[ob.id] = data

      if (this.master.onAppear) {
        this.master.onAppear(data)
      }

      this.master.emit('add', ob, data)
      this.emit('add', ob, data)
    }
  }

  finishAdding () {
    for (var k in this.visibleFeatures) {
      if (!(k in this.currentRequestFeatures)) {
        if (!(k in this.shownFeatures)) {
          this._hide(this.visibleFeatures[k])
        }

        delete this.visibleFeatures[k]
      }
    }
  }

  hideAll (force) {
    for (const k in this.visibleFeatures) {
      const ob = this.visibleFeatures[k]

      if (force || !(ob.id in this.shownFeatures)) {
        this._hide(ob)
      }
    }

    this.visibleFeatures = {}
  }

  // Hide loaded but non-visible objects
  hideNonVisible (bounds) {
    for (const k in this.visibleFeatures) {
      const ob = this.visibleFeatures[k]

      if (!ob.object.intersects(bounds)) {
        if (!(ob.id in this.shownFeatures)) {
          this._hide(ob)
        }

        delete this.visibleFeatures[k]
      }
    }
  }

  /**
   * Hide all objects which do not satisfy the filter
   * @param {OverpassFrontend.Filter} filter A filter, e.g. new OverpassFrontend.Filter('nwr[amenity=restaurant]')
   */
  hideNonVisibleFilter (filter) {
    for (const k in this.visibleFeatures) {
      const ob = this.visibleFeatures[k]

      if (!filter.match(ob.object)) {
        if (!(ob.id in this.shownFeatures)) {
          this._hide(ob)
        }

        delete this.visibleFeatures[k]
      }
    }
  }

  get (id, options, callback) {
    let isAborted = false
    let isDone = false

    const result = {
      id,
      options,
      abort: () => {
        if (isDone) {
          console.log('abort called, although done')
          return
        }

        isAborted = true
        isDone = true
        if (result.request) {
          result.request.abort()
        }
      }
    }

    if (id in this.visibleFeatures) {
      window.setTimeout(() => {
        isDone = true
        if (!isAborted) {
          callback(null, this.visibleFeatures[id])
        }
      }, 0)
      return result
    }

    if (id in this.shownFeatures) {
      window.setTimeout(() => {
        isDone = true
        if (!isAborted) {
          callback(null, this.shownFeatures[id])
        }
      }, 0)
      return result
    }

    result.request = this.master.get(id, (err, ob) => {
      isDone = true

      if (err) {
        return callback(err)
      }

      if (isAborted) {
        return
      }

      if (ob === null) {
        return console.log('object does not exist', id)
      }

      let data
      if (id in this.visibleFeatures) {
        data = this.visibleFeatures[id]
      } else if (id in this.shownFeatures) {
        data = this.shownFeatures[id]
      } else {
        data = new SublayerFeature(ob, this)
      }

      callback(null, data)
    })

    return result
  }

  show (data, options, callback) {
    const show1 = () => {
      id = data.id
      result.id = id

      this.shownFeatures[id] = data
      if (!(id in this.shownFeatureOptions)) {
        this.shownFeatureOptions[id] = []
      }

      this.shownFeatureOptions[id].push(options)
      data.isShown = true

      data.updateFlags()

      this._processObject(data)

      this._show(data)

      callback(null, data.object, data)
    }

    let id = typeof data === 'string' ? data : data.id
    let isHidden = false
    const result = {
      options,
      hide: () => {
        if (isHidden) {
          console.log('already hidden')
        }

        isHidden = true

        if (result.request) {
          result.request.abort()
          delete result.request
          return
        }

        if (id in this.shownFeatures) {
          var i = this.shownFeatureOptions[id].indexOf(options)
          if (i !== -1) {
            this.shownFeatureOptions[id].splice(i, 1)
          }

          data.updateFlags()

          if (this.shownFeatureOptions[id].length === 0) {
            this.hide(data)
          } else {
            this._processObject(this.shownFeatures[id])
          }
        }
      }
    }

    options.priority = -1
    options.properties = OverpassFrontend.ALL

    if (typeof data === 'string') {
      result.request = this.get(data, options, (err, _data) => {
        delete result.request

        if (isHidden) {
          return
        }

        if (err) {
          callback(err)
          return
        }

        data = _data

        show1()
      })
    } else {
      show1()
    }

    return result
  }

  hide (id) {
    if (typeof id === 'object') {
      id = id.id
    }

    if (id in this.shownFeatures) {
      const data = this.shownFeatures[id]
      delete this.shownFeatures[id]
      delete this.shownFeatureOptions[id]

      if (id in this.visibleFeatures) {
        this._processObject(data)
      } else {
        this._hide(data)
      }
    }
  }

  zoomChange () {
    this.recalc()

    for (const k in this.visibleFeatures) {
      const data = this.visibleFeatures[k]

      this.master.emit('zoomChange', data.object, data)
      this.emit('zoomChange', data.object, data)

      if (this.master.onZoomChange) {
        this.master.onZoomChange(data)
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
    const leafletFeatureOptions = {
      shiftWorld: this.master.getShiftWorld()
    }

    if (ob.id in this.shownFeatureOptions) {
      this.shownFeatureOptions[ob.id].forEach(function (opt) {
        if ('styles' in opt) {
          showOptions.styles = showOptions.styles.concat(opt.styles)
        }
      })
    }

    var objectData = this.evaluate(data)

    if (!data.feature) {
      data.feature = ob.leafletFeature(Object.assign({
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

        if (data.features[styleId]) {
          data.features[styleId].setStyle(style)
        } else {
          data.features[styleId] = ob.leafletFeature(Object.assign(style, leafletFeatureOptions))
        }

        if ('text' in style && 'setText' in data.features[styleId]) {
          data.features[styleId].setText(null)
          data.features[styleId].setText(style.text, {
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

      this.updateAssets(div, objectData)
    }

    if (objectData.markerSign) {
      const x = objectData.marker.iconAnchor[0] + objectData.marker.signAnchor[0]
      const y = -objectData.marker.iconSize[1] + objectData.marker.iconAnchor[1] + objectData.marker.signAnchor[1]
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
        const center = { lat: ob.center.lat, lon: ob.center.lon + leafletFeatureOptions.shiftWorld[ob.center.lon < 0 ? 0 : 1] }
        data.featureMarker = L.marker(center, { icon: icon })
      }
    }

    if (data.isShown) {
      for (k in data.features) {
        data.feature.addTo(this.map)
        if (objectData.styles && objectData.styles.indexOf(k) !== -1 && data.styles && data.styles.indexOf(k) === -1) {
          data.features[k].addTo(this.map)
        }
        if (objectData.styles && objectData.styles.indexOf(k) === -1 && data.styles && data.styles.indexOf(k) !== -1) {
          this.map.removeLayer(data.features[k])
        }
      }
    }
    data.styles = objectData.styles

    var popupContent = ''
    popupContent += '<h1>' + objectData.title + '</h1>'
    var popupDescription = objectData.popupDescription || objectData.description
    if (popupDescription) {
      popupContent += '<div class="description">' + popupDescription + '</div>'
    }
    if (objectData.body) {
      popupContent += '<div class="body">' + objectData.body + '</div>'
    }

    if (data.popup) {
      if (data.popup._contentNode) {
        if (data.popup.currentHTML !== popupContent) {
          data.popup._contentNode.innerHTML = popupContent
          this.updateAssets(data.popup._contentNode, objectData)
        }
      } else {
        data.popup.setContent(popupContent)
      }

      data.popup.currentHTML = popupContent
    } else {
      data.popup = L.popup().setContent(popupContent)
      data.popup.object = data
      data.popup.sublayer = this

      data.feature.bindPopup(data.popup)
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
    data.sublayer_id = this.options.sublayer_id
    data.data = objectData

    if (this.master.onUpdate) {
      this.master.onUpdate(data)
    }

    this.master.emit('update', data.object, data)
    this.emit('update', data.object, data)
  }

  evaluate (data) {
    var k
    var ob = data.object

    data.twigData = this.twigData(ob, data)

    var objectData = {}
    for (k in this.options.feature) {
      if (typeof this.options.feature[k] === 'function') {
        objectData[k] = this.options.feature[k](data.twigData)
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
        objectData.styles = styles.split(/,/).map(style => style.trim())
      }
    }

    return objectData
  }

  twigData (ob, data) {
    var result = {
      id: ob.id,
      sublayer_id: this.options.sublayer_id,
      osm_id: ob.osm_id,
      type: ob.type,
      tags: ob.tags,
      meta: ob.meta,
      flags: data.flags,
      members: [],
      const: this.options.const
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

    this.emit('twigData', ob, data, result)
    this.master.emit('twigData', ob, data, result)

    return result
  }

  _shallBindPopupToStyle (styleId) {
    return this.options.styleNoBindPopup.indexOf(styleId) === -1
  }

  _show (data) {
    if (!this.map) {
      return
    }

    data.feature.addTo(this.map)
    for (var i = 0; i < data.styles.length; i++) {
      var k = data.styles[i]
      if (k in data.features) {
        data.features[k].addTo(this.map)
      }
    }

    if (data.featureMarker) {
      data.featureMarker.addTo(this.map)
      this.updateAssets(data.featureMarker._icon)
    }

    data.object.on('update', this.scheduleReprocess.bind(this, data.id))

    data.isShown = true
  }

  _hide (data) {
    this.master.emit('remove', data.object, data)
    this.emit('remove', data.object, data)

    this.map.removeLayer(data.feature)
    for (var k in data.features) {
      this.map.removeLayer(data.features[k])
    }

    if (data.featureMarker) {
      this.map.removeLayer(data.featureMarker)
    }

    if (this.master.onDisappear) {
      this.master.onDisappear(data)
    }

    data.object.off('update', this.scheduleReprocess.bind(this, data.id))

    data.isShown = false
  }

  scheduleReprocess (id) {
    if (!(id in this._scheduledReprocesses)) {
      this._scheduledReprocesses[id] = window.setTimeout(() => {
        delete this._scheduledReprocesses[id]

        if (id in this.visibleFeatures) {
          this._processObject(this.visibleFeatures[id])
        }
      }, 0)
    }
  }

  updateAssets (div, objectData) {
    this.domUpdateHooks(div)

    if (this.options.updateAssets) {
      this.options.updateAssets(div, objectData, this)
    }
  }

  openPopupOnObject (ob, options) {
    if (typeof ob === 'string') {
      return this.get(ob, options, (err, ob) => {
        if (err) {
          return console.log(err)
        }

        this._processObject(ob)
        this._show(ob)
        this.openPopupOnObject(ob, options)
      })
    }

    // When object is quite smaller than current view, show popup on feature
    const viewBounds = new BoundingBox(this.map.getBounds())
    const obBounds = new BoundingBox(ob.object.bounds)
    if (obBounds.diagonalLength() * 0.75 < viewBounds.diagonalLength()) {
      return ob.feature.openPopup()
    }

    // otherwise, try to find point on geometry closest to center of view
    const pt = this.map.getCenter()
    const geom = ob.object.GeoJSON()
    let pos = nearestPointOnGeometry(geom, { type: 'Feature', geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] } })
    if (pos) {
      pos = pos.geometry.coordinates
      return ob.feature.openPopup([pos[1], pos[0]])
    }

    // no point found? use normal object popup open then ...
    ob.feature.openPopup()
  }
}

ee(Sublayer.prototype)

module.exports = Sublayer
