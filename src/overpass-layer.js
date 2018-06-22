/* global overpassFrontend:false, L */
require('./overpass-layer.css')

var BoundingBox = require('boundingbox')
var twig = require('twig')
var OverpassFrontend = require('overpass-frontend')
var escapeHtml = require('html-escape')
const nearestPointOnGeometry = require('nearest-point-on-geometry')
var isTrue = require('./isTrue')
var Sublayer = require('./Sublayer')
var compileFeature = require('./compileFeature')

function OverpassLayer (options) {
  var template

  if (!options) {
    options = {}
  }

  this.options = options

  this.overpassFrontend = 'overpassFrontend' in this.options ? this.options.overpassFrontend : overpassFrontend
  this.options.minZoom = 'minZoom' in this.options ? this.options.minZoom : 16
  this.options.maxZoom = 'maxZoom' in this.options ? this.options.maxZoom : null
  this.options.feature = 'feature' in this.options ? this.options.feature : {}
  this.options.feature.style = 'style' in this.options.feature ? this.options.feature.style : {}
  this.options.feature.title = 'title' in this.options.feature ? this.options.feature.title : function (ob) { return escapeHtml(ob.tags.name || ob.tags.operator || ob.tags.ref || ob.id) }
  this.options.feature.body = 'body' in this.options.feature ? this.options.feature.body : ''
  this.options.feature.markerSymbol = 'markerSymbol' in this.options.feature ? this.options.feature.markerSymbol : '<img anchorX="13" anchorY="42" width="25" height="42" signAnchorX="0" signAnchorY="-30" src="img/map_pointer.png">'
  this.options.feature.markerSign = 'markerSign' in this.options.feature ? this.options.feature.markerSign : null
  this.options.queryOptions = 'queryOptions' in this.options ? this.options.queryOptions : {}
  if (!('properties' in this.options.queryOptions)) {
    this.options.queryOptions.properties = OverpassFrontend.ALL
  }
  this.options.styleNoBindPopup = this.options.styleNoBindPopup || []
  this.options.stylesNoAutoShow = this.options.stylesNoAutoShow || []

  compileFeature(this.options.feature, twig)

  this.currentRequest = null
  this.lastZoom = null
  this._scheduledReprocesses = {}

  this.mainlayer = new Sublayer(this, options)

  this.subLayers = [ this.mainlayer ]
}

OverpassLayer.prototype.addTo = function (map) {
  this.map = map
  this.map.on('moveend', this.check_update_map, this)
  this.subLayers.forEach(layer => layer.addTo(map))
  this.check_update_map()

  this.map.createPane('hover')
  this.map.getPane('hover').style.zIndex = 499
}

OverpassLayer.prototype.remove = function () {
  var k

  this.subLayers.forEach(layer => layer.hideAll(true))
  this.subLayers.forEach(layer => layer.remove())

  this.abortRequest()

  this.map.off('moveend', this.check_update_map, this)
  this.map = null
}

OverpassLayer.prototype.abortRequest = function () {
  if (this.currentRequest) {
    if (this.onLoadEnd) {
      this.onLoadEnd({
        request: this.currentRequest,
        error: 'abort'
      })
    }

    this.currentRequest.abort()
    this.currentRequest = null
  }
}

OverpassLayer.prototype.check_update_map = function () {
  var bounds = new BoundingBox(this.map.getBounds())
  var k
  var ob

  if (this.map.getZoom() < this.options.minZoom ||
     (this.options.maxZoom !== null && this.map.getZoom() > this.options.maxZoom)) {
    this.subLayers.forEach(layer => layer.hideAll())

    // abort remaining request
    this.abortRequest()

    return
  }

  this.subLayers.forEach(layer => layer.hideNonVisible(bounds))

  // When zoom level changed, update visible objects
  if (this.lastZoom !== this.map.getZoom()) {
    this.subLayers.forEach(layer => layer.zoomChange())
    this.lastZoom = this.map.getZoom()
  }

  // Abort current requests (in case they are long-lasting - we don't need them
  // anyway). Data which is being submitted will still be loaded to the cache.
  this.abortRequest()

  var query = this.options.query
  if (typeof query === 'object') {
    query = query[Object.keys(query).filter(function (x) { return x <= this.map.getZoom() }.bind(this)).reverse()[0]]
  }

  if (!query) {
    return
  }

  this.subLayers.forEach(layer => layer.startAdding())

  this.currentRequest = this.overpassFrontend.BBoxQuery(query, bounds,
    this.options.queryOptions,
    function (err, ob) {
      if (err) {
        console.log('unexpected error', err)
      }

      this.mainlayer.add(ob)

    }.bind(this),
    function (err) {
      if (err === 'abort') {
        return
      }

      if (this.onLoadEnd) {
        this.onLoadEnd({
          request: this.currentRequest,
          error: err
        })
      }

      this.subLayers.forEach(layer => layer.finishAdding())

      this.currentRequest = null
    }.bind(this)
  )

  if (this.onLoadStart) {
    this.onLoadStart({
      request: this.currentRequest
    })
  }
}

OverpassLayer.prototype.recalc = function () {
  this.subLayers.forEach(layer => layer.recalc())
}

OverpassLayer.prototype.scheduleReprocess = function (id) {
  this.subLayers.forEach(layer => layer.scheduleReprocess(id))
}

OverpassLayer.prototype.updateAssets = function (div, objectData) {
  this.subLayers.forEach(layer => layer.updateAssets(div, objectData))
}

OverpassLayer.prototype.get = function (id, callback) {
  var done = false

  this.overpassFrontend.get(id,
    {
      properties: OverpassFrontend.ALL
    },
    function (err, ob) {
      if (err === null) {
        callback(err, ob)
      }

      done = true
    }.bind(this),
    function (err) {
      if (!done) {
        callback(err, null)
      }
    }
  )
}

OverpassLayer.prototype.show = function (id, options, callback) {
  let request = this.mainlayer.show(id, options)
  let result = {
    id: id,
    options: options,
    hide: request.hide
  }

  return result
}

OverpassLayer.prototype.hide = function (id) {
  this.mainlayer.hide(id)
}

OverpassLayer.prototype.openPopupOnObject = function (ob) {
  // When object is quite smaller than current view, show popup on feature
  let viewBounds = new BoundingBox(this.map.getBounds())
  let obBounds = new BoundingBox(ob.object.bounds)
  if (obBounds.diagonalLength() * 0.75 < viewBounds.diagonalLength()) {
    return ob.feature.openPopup()
  }

  // otherwise, try to find point on geometry closest to center of view
  let pt = this.map.getCenter()
  let geom = ob.object.GeoJSON()
  let pos = nearestPointOnGeometry(geom, { type: 'Feature', geometry: { type: 'Point', coordinates: [ pt.lng, pt.lat ] } })
  if (pos) {
    pos = pos.geometry.coordinates
    return ob.feature.openPopup([pos[1], pos[0]])
  }

  // no point found? use normal object popup open then ...
  ob.feature.openPopup()
}

// to enable extending twig
OverpassLayer.twig = twig

module.exports = OverpassLayer
