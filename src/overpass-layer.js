/* global overpassFrontend:false */

var BoundingBox = require('boundingbox')
var twig = require('twig')
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
  this.options.queryOptions = 'queryOptions' in this.options ? this.options.queryOptions : {}
  if (!('properties' in this.options.queryOptions)) {
    this.options.queryOptions.properties = OverpassFrontend.ALL
  }

  for (var k in this.options.feature) {
    if (typeof this.options.feature[k] === 'string' && this.options.feature[k].search('{') !== -1) {
      var template = twig.twig({ data: this.options.feature[k], autoescape: true })
      this.options.feature[k] = function (template, ob) {
        return template.render(ob)
      }.bind(this, template)
    } else if (typeof this.options.feature[k] === 'object' && (['style'].indexOf(k) !== -1 || k.match(/^style:/))) {
      var templates = {}
      for (var k1 in this.options.feature[k]) {
        if (typeof this.options.feature[k][k1] === 'string' && this.options.feature[k][k1].search('{') !== -1) {
          templates[k1] = twig.twig({ data: this.options.feature[k][k1], autoescape: true })
        } else {
          templates[k1] = this.options.feature[k][k1]
        }
      }

      this.options.feature[k] = function (templates, ob) {
        var ret = {}
        for (var k1 in templates) {
          if (typeof templates[k1] === 'object' && 'render' in templates[k1]) {
            ret[k1] = templates[k1].render(ob)
          } else {
            ret[k1] = templates[k1]
          }
        }
        return ret
      }.bind(this, templates)
    }
  }

  this.visibleFeatures = {}
  this.shownFeatures = {} // features which are forcibly shown
  this.currentRequest = null
  this.lastZoom = null
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
  var thisRequestFeatures = {}

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

  // When zoom level changed, update visible objects
  if (this.lastZoom !== this.map.getZoom()) {
    this.recalc()

    for (k in this.visibleFeatures) {
      if (this.onZoomChange) {
        this.onZoomChange(this.visibleFeatures[k])
      }
    }

    this.lastZoom = this.map.getZoom()
  }

  // Abort current requests (in case they are long-lasting - we don't need them
  // anyway). Data which is being submitted will still be loaded to the cache.
  if (this.currentRequest) {
    if (this.onLoadEnd) {
      this.onLoadEnd ({
        request: this.currentRequest,
        error: 'abort'
      })
    }

    this.currentRequest.abort()
    this.currentRequest = null
  }

  var query = this.options.query
  if (typeof query === 'object') {
    query = query[Object.keys(query).filter(function (x) { return x <= this.map.getZoom() }.bind(this)).reverse()[0]]
  }

  if (!query) {
    return
  }

  this.currentRequest = this.overpassFrontend.BBoxQuery(query, bounds,
    this.options.queryOptions,
    function (err, ob) {
      thisRequestFeatures[ob.id] = true

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

        if (this.onAppear) {
          this.onAppear(data)
        }
      }
    }.bind(this),
    function (err) {
      if (err === 'abort') {
        return
      }

      if (this.onLoadEnd) {
        this.onLoadEnd ({
          request: this.currentRequest,
          error: err
        })
      }

      for (var k in this.visibleFeatures) {
        if (!(k in thisRequestFeatures)) {
          if (!(k in this.shownFeatures)) {
            this._hide(this.visibleFeatures[k])
          }

          if (this.onDisappear) {
            this.onDisappear(this.visibleFeatures[k])
          }

          delete this.visibleFeatures[k]
        }
      }

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
  for (k in this.visibleFeatures) {
    this._processObject(this.visibleFeatures[k])

    if (this.onUpdate) {
      this.onUpdate(this.visibleFeatures[k])
    }
  }
}

OverpassLayer.prototype._show = function (data) {
  for (var i = 0; i < data.styles.length; i++) {
    var k = data.styles[i]
    if (k in data.features) {
      data.features[k].addTo(this.map)
    }
  }

  if (data.featureMarker) {
    data.featureMarker.addTo(this.map)
  }

  data.isShown = true
}

OverpassLayer.prototype._hide = function (data) {
  for (var k in data.features) {
    this.map.removeLayer(data.features[k])
  }

  if (data.featureMarker) {
    this.map.removeLayer(data.featureMarker)
  }

  data.isShown = false
}

OverpassLayer.prototype._processObject = function (data) {
  var ob = data.object

  var twigData = {
    id: ob.id,
    layer_id: this.options.id,
    osm_id: ob.osm_id,
    type: ob.type,
    tags: ob.tags,
    meta: ob.meta,
    map: {
      zoom: this.map.getZoom()
    },
    'const': this.options.const
  }

  var objectData = {}
  for (var k in this.options.feature) {
    if (typeof this.options.feature[k] === 'function') {
      objectData[k] = this.options.feature[k](twigData)
    } else {
      objectData[k] = this.options.feature[k]
    }
  }

  for (var k in objectData) {
    if (k.match(/^style(:.*|)$/)) {
      var style = objectData[k]
      if (typeof style === 'string' || 'twig_markup' in style) {
        objectData[k] = strToStyle(style)
      }
    }
  }

  if (!('features' in data)) {
    data.features = {}
  }

  for (var k in objectData) {
    var m = k.match(/^style(|:(.*))$/)
    if (m) {
      var styleId = typeof m[2] === 'undefined' ? 'default' : m[2]

      if (data.features[styleId]) {
        data.features[styleId].setStyle(objectData[k])
      } else {
        data.features[styleId] = ob.leafletFeature(objectData[k])
      }
    }
  }

  var styles = 'styles' in objectData ? objectData.styles : 'styles' in this.options ? this.options.styles : [ 'default' ]
  if (typeof styles === 'string' || 'twig_markup' in styles) {
    styles = styles.split(/,/)
  }

  if (objectData.marker) {
    var markerHtml = '<img src="' + objectData.marker.iconUrl + '">'
    if (objectData.markerSign) {
      markerHtml += '<div>' + objectData.markerSign + '</div>'
    }

    objectData.marker.html = markerHtml
    objectData.marker.className = 'overpass-layer-icon'
    var icon = L.divIcon(objectData.marker)

    if (data.featureMarker) {
      data.featureMarker.setIcon(icon)
    } else {
      data.featureMarker = L.marker(ob.center, { icon: icon })
    }
  }

  if (data.isShown) {
    for (var k in data.features) {
      if (styles.indexOf(k) !== -1 && data.styles.indexOf(k) === -1) {
        data.features[k].addTo(this.map)
      }
      if (styles.indexOf(k) === -1 && data.styles.indexOf(k) !== -1) {
        this.map.removeLayer(data.features[k])
      }
    }
  }
  data.styles = styles

  var popupContent = ''
  popupContent += '<h1>' + objectData.title + '</h1>'
  popupContent += objectData.body

  if (data.popup) {
    data.popup = data.popup.setContent(popupContent)
  } else {
    data.popup = L.popup().setContent(popupContent)
    data.popup.object = data

    for (var k in data.features) {
      data.features[k].bindPopup(data.popup)
    }

    if (data.featureMarker) {
      data.featureMarker.bindPopup(data.popup)
    }
  }

  data.id = ob.id
  data.layer_id = this.options.id
  data.data = objectData
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
        var data = {
          object: ob,
          isShown: false
        }

        if (id in this.shownFeatures) {
          data = this.shownFeatures[id]
        } else if (id in this.visibleFeatures) {
          data = this.visibleFeatures[id]
        } else {
          this._processObject(data)
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

function strToStyle (style) {
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

  return style
}

// to enable extending twig
OverpassLayer.twig = twig

module.exports = OverpassLayer
