/* global L */

const ee = require('event-emitter')
const OverpassFrontend = require('overpass-frontend')
const nearestPointOnGeometry = require('nearest-point-on-geometry')
const BoundingBox = require('boundingbox')

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
    this.map.on('popupclose', this._popupClose.bind(this))
  }

  _popupOpen (e) {
    if (e.popup.sublayer === this) {
      let feature = e.popup.feature
      this.emit('selectObject', feature.object, feature)
      this.master.emit('selectObject', feature.object, feature)

      this.updateAssets(e.popup._contentNode)
    }
  }

  _popupClose (e) {
    if (e.popup.sublayer === this) {
      let feature = e.popup.feature
      this.emit('unselectObject', feature.object, feature)
      this.master.emit('unselectObject', feature.object, feature)

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
      var feature = new SublayerFeature(ob, this)

      if (ob.id in this.shownFeatures) {
        feature = this.shownFeatures[ob.id]
      } else {
        this._processObject(feature)

        this._show(feature)
      }

      this.visibleFeatures[ob.id] = feature

      if (this.master.onAppear) {
        this.master.onAppear(feature)
      }

      this.master.emit('add', ob, feature)
      this.emit('add', ob, feature)
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
      const feature = this.visibleFeatures[k]

      if (force || !(feature.id in this.shownFeatures)) {
        this._hide(feature)
      }
    }

    this.visibleFeatures = {}
  }

  // Hide loaded but non-visible objects
  hideNonVisible (bounds) {
    for (const k in this.visibleFeatures) {
      const feature = this.visibleFeatures[k]

      if (!feature.object.intersects(bounds)) {
        if (!(feature.id in this.shownFeatures)) {
          this._hide(feature)
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
      const feature = this.visibleFeatures[k]

      if (!filter.match(feature.object)) {
        if (!(feature.id in this.shownFeatures)) {
          this._hide(feature)
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

      let feature
      if (id in this.visibleFeatures) {
        feature = this.visibleFeatures[id]
      } else if (id in this.shownFeatures) {
        feature = this.shownFeatures[id]
      } else {
        feature = new SublayerFeature(ob, this)
      }

      callback(null, feature)
    })

    return result
  }

  show (feature, options, callback) {
    const show1 = () => {
      id = feature.id
      result.id = id

      this.shownFeatures[id] = feature
      if (!(id in this.shownFeatureOptions)) {
        this.shownFeatureOptions[id] = []
      }

      this.shownFeatureOptions[id].push(options)
      feature.isShown = true

      feature.updateFlags()

      this._processObject(feature)

      this._show(feature)

      callback(null, feature.object, feature)
    }

    let id = typeof feature === 'string' ? feature : feature.id
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

          feature.updateFlags()

          if (this.shownFeatureOptions[id].length === 0) {
            this.hide(feature)
          } else {
            this._processObject(this.shownFeatures[id])
          }
        }
      }
    }

    options.priority = -1
    options.properties = OverpassFrontend.ALL

    if (typeof feature === 'string') {
      result.request = this.get(feature, options, (err, _feature) => {
        delete result.request

        if (isHidden) {
          return
        }

        if (err) {
          callback(err)
          return
        }

        feature = _feature

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
      const feature = this.shownFeatures[id]
      delete this.shownFeatures[id]
      delete this.shownFeatureOptions[id]

      if (id in this.visibleFeatures) {
        this._processObject(feature)
      } else {
        this._hide(feature)
      }
    }
  }

  zoomChange () {
    this.recalc()

    for (const k in this.visibleFeatures) {
      const feature = this.visibleFeatures[k]

      this.master.emit('zoomChange', feature.object, feature)
      this.emit('zoomChange', feature.object, feature)

      if (this.master.onZoomChange) {
        this.master.onZoomChange(feature)
      }
    }

    this.lastZoom = this.map.getZoom()
  }

  recalc () {
    for (var k in this.visibleFeatures) {
      this._processObject(this.visibleFeatures[k])
    }
  }

  _processObject (feature) {
    console.log('sublayer._processObject')
    feature._processObject()
  }

  evaluate (feature) {
    console.log('sublayer.evaluate')
    feature.evaluate()
  }

  twigData (ob, feature) {
    console.log('sublayer twigData')
    feature.twigData()
  }

  _shallBindPopupToStyle (styleId) {
    return this.options.styleNoBindPopup.indexOf(styleId) === -1
  }

  _show (data) {
    console.log('sublayer._show')
    data._show()
  }

  _hide (data) {
    console.log('sublayer._hide')
    data._hide()
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
