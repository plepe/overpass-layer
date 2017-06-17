/* global overpassFrontend:false */

var BoundingBox = require('boundingbox')
var twig = require('twig').twig
var OverpassFrontend = require('overpass-frontend')
var escapeHtml = require('html-escape')

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
  this.options.feature.marker = 'marker' in this.options.feature ? this.options.feature.marker : null
  this.options.feature.markerSign = 'markerSign' in this.options.feature ? this.options.feature.markerSign : null
  if (this.options.feature.marker === null && this.options.feature.markerSign !== null) {
    this.options.feature.marker = {
        iconUrl: 'img/map_pointer.png',
        iconSize: [ 25, 42 ],
        iconAnchor: [ 13, 42 ]
    }
  }

  for (var k in this.options.feature) {
    if (typeof this.options.feature[k] === 'string') {
      template = twig({ data: this.options.feature[k], autoescape: true })
      this.options.feature[k] = function (template, ob) {
        return template.render(ob)
      }.bind(this, template)
    }
  }

  this.visibleFeatures = {}
  this.shownFeatures = {} // features which are forcibly shown
  this.currentRequest = null
}

OverpassLayer.prototype.addTo = function (map) {
  this.map = map
  this.map.on('moveend', this.check_update_map, this)
  this.check_update_map()
}

OverpassLayer.prototype.remove = function () {
  var k
  var ob

  for (k in this.visibleFeatures) {
    this._hide(this.visibleFeatures[k])
  }

  for (k in this.shownFeatures) {
    this._hide(this.shownFeatures[k])
  }

  this.visibleFeatures = {}
  this.shownFeatures = {}

  this.map.off('moveend', this.check_update_map, this)
  this.map = null
}

OverpassLayer.prototype.check_update_map = function () {
  var bounds = new BoundingBox(this.map.getBounds())
  var k
  var ob

  if (this.map.getZoom() < this.options.minZoom ||
     (this.options.maxZoom !== null && this.map.getZoom() > this.options.maxZoom)) {
    for (k in this.visibleFeatures) {
      ob = this.visibleFeatures[k]

      if (this.onDisappear) {
        this.onDisappear(ob)
      }

      if (!(ob.id in this.shownFeatures)) {
        this._hide(ob)
      }
    }

    this.visibleFeatures = {}

    // abort remaining request
    if (this.currentRequest) {
      this.currentRequest.abort()
      this.currentRequest = null
    }

    return
  }

  // Hide loaded but non-visible objects
  for (k in this.visibleFeatures) {
    ob = this.visibleFeatures[k]

    if (!ob.object.intersects(bounds)) {
      if (this.onDisappear) {
        this.onDisappear(ob)
      }

      if (!(ob.id in this.shownFeatures)) {
        this._hide(ob)
      }

      delete this.visibleFeatures[k]
    }
  }

  // Abort current requests (in case they are long-lasting - we don't need them
  // anyway). Data which is being submitted will still be loaded to the cache.
  if (this.currentRequest) {
    this.currentRequest.abort()
    this.currentRequest = null
  }

  // Query all trees in the current view
  this.currentRequest = this.overpassFrontend.BBoxQuery(this.options.query, bounds,
    {
      properties: OverpassFrontend.ALL
    },
    function (err, ob) {
      if (!(ob.id in this.visibleFeatures)) {
        var data

        if (ob.id in this.shownFeatures) {
          data = this.shownFeatures[ob.id]
        } else {
          data = this.processObject(ob)

          this._show(data)
        }

        this.visibleFeatures[ob.id] = data

        if (this.onAppear) {
          this.onAppear(data)
        }
      }
    }.bind(this),
    function (err) {
      if (err !== 'abort') {
        this.currentRequest = null
      }
    }.bind(this)
  )
}

OverpassLayer.prototype._show = function (data) {
  data.feature.addTo(this.map)
  if (data.featureMarker) {
    data.featureMarker.addTo(this.map)
  }
}

OverpassLayer.prototype._hide = function (data) {
  this.map.removeLayer(data.feature)
  if (data.featureMarker) {
    this.map.removeLayer(data.featureMarker)
  }
}

OverpassLayer.prototype.processObject = function (ob) {
  var feature

  var objectData = {}
  for (var k in this.options.feature) {
    if (typeof this.options.feature[k] === 'function') {
      objectData[k] = this.options.feature[k](ob)
    } else {
      objectData[k] = this.options.feature[k]
    }
  }

  var style = objectData.style
  if (typeof style === 'string') {
    var str = style.split('\n')
    style = {}

    for (var i = 0; i < str.length; i++) {
      var m
      if ((m = str[i].match(/^\s*([a-zA-Z0-9_]+)\s*:\s*(.*)\s*$/))) {
        var v = m[2].trim()

        if (v.match(/^\-?[0-9]+(\.[0-9]+)?/)) {
          v = parseFloat(v)
        }

        style[m[1]] = v
      }
    }
  }

  feature = ob.leafletFeature(style)

  var featureMarker
  if (objectData.marker) {
    var markerHtml = '<img src="' + objectData.marker.iconUrl + '">'
    if (objectData.markerSign) {
      markerHtml += '<div>' + objectData.markerSign + '</div>'
    }

    objectData.marker.html = markerHtml
    objectData.marker.className = 'overpass-layer-icon'
    var icon = L.divIcon(objectData.marker)

    featureMarker = L.marker(ob.center, { icon: icon })
  }

  var popupContent = ''
  popupContent += '<h1>' + objectData.title + '</h1>'
  popupContent += objectData.body

  feature.bindPopup(popupContent)
  if (featureMarker) {
    featureMarker.bindPopup(popupContent)
  }

  return {
    id: ob.id,
    object: ob,
    data: objectData,
    feature: feature,
    featureMarker: featureMarker
  }
}

OverpassLayer.prototype.get = function (id, callback) {
  var done = false

  if (id in this.visibleFeatures) {
    callback(this.visibleFeatures[id])
    return
  }

  if (id in this.shownFeatures) {
    callback(this.shownFeatures[id])
    return
  }

  this.overpassFrontend.get(id,
    {
      properties: OverpassFrontend.ALL
    },
    function (err, ob) {
      if (err === null) {
        var data

        if (id in this.shownFeatures) {
          data = this.shownFeatures[id]
        } else if (id in this.visibleFeatures) {
          data = this.visibleFeatures[id]
        } else {
          data = this.processObject(ob)
        }

        callback(err, data)
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
  if (id in this.shownFeatures) {
    callback(null, this.shownFeatures[id])
    return
  }

  if (id in this.visibleFeatures) {
    this.shownFeatures[id] = this.visibleFeatures[id]
    callback(null, this.shownFeatures[id])
    return
  }

  this.get(id,
    function (err, data) {
      if (err) {
        return callback(err, data)
      }

      this.shownFeatures[id] = data

      if (!(id in this.visibleFeatures)) {
        this._show(data)
      }

      callback(err, data)
    }.bind(this)
  )
}

OverpassLayer.prototype.hide = function (id) {
  if (id in this.shownFeatures) {
    this._hide(this.shownFeatures[id])
    delete this.shownFeatures[id]
    delete this.visibleFeatures[id]
  }

  this.check_update_map()
}

module.exports = OverpassLayer
