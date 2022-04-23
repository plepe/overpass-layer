/* global L */

const ee = require('event-emitter')
const OverpassFrontend = require('overpass-frontend')
const nearestPointOnGeometry = require('nearest-point-on-geometry')
const BoundingBox = require('boundingbox')

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
      const ob = e.popup.object
      this.emit('selectObject', ob.object, ob)
      this.master.emit('selectObject', ob.object, ob)

      this.updateAssets(e.popup._contentNode)
    }
  }

  _popupClose (e) {
    if (e.popup.sublayer === this) {
      const ob = e.popup.object
      this.emit('unselectObject', ob.object, ob)
      this.master.emit('unselectObject', ob.object, ob)

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
            if (this.currentHover.id === id) {
              return
            }

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
      let data = new SublayerFeature(ob, this)

      if (ob.id in this.shownFeatures) {
        data = this.shownFeatures[ob.id]
      } else {
        data.processObject()

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
    for (const k in this.visibleFeatures) {
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

      data.processObject()

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
          const i = this.shownFeatureOptions[id].indexOf(options)
          if (i !== -1) {
            this.shownFeatureOptions[id].splice(i, 1)
          }

          data.updateFlags()

          if (this.shownFeatureOptions[id].length === 0) {
            this.hide(data)
          } else {
            this.shownFeatures[id].processObject()
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
        data.processObject()
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
    for (const k in this.visibleFeatures) {
      this.visibleFeatures[k].processObject()
    }
  }

  _shallBindPopupToStyle (styleId) {
    return this.options.styleNoBindPopup.indexOf(styleId) === -1
  }

  _show (data) {
    if (!this.map) {
      return
    }

    data.feature.addTo(this.map)
    for (let i = 0; i < data.styles.length; i++) {
      const k = data.styles[i]
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
    for (const k in data.features) {
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
          this.visibleFeatures[id].processObject()
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

        ob.processObject()
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
