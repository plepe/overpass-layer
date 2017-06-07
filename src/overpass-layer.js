/* global overpassFrontend:false */

var BoundingBox = require('boundingbox')
var twig = require('twig').twig
var OverpassFrontend = require('overpass-frontend')

function OverpassLayer (query, options) {
  var template

  if (!options) {
    options = {}
  }

  this.query = query
  this.overpassFrontend = 'overpassFrontend' in options ? options.overpassFrontend : overpassFrontend
  this.style = 'style' in options ? options.style : {}
  this.minZoom = 'minZoom' in options ? options.minZoom : 16
  this.maxZoom = 'maxZoom' in options ? options.maxZoom : null
  this.featureTitle = 'featureTitle' in options ? options.featureTitle : function (ob) { return ob.tags.name || ob.tags.operator || ob.tags.ref || ob.id }
  this.featureBody = 'featureBody' in options ? options.featureBody : ''
  this.marker = 'marker' in options ? options.marker : null
  this.markerSign = 'markerSign' in options ? options.markerSign : null
  if (this.marker === null && this.markerSign !== null) {
    this.marker = {
        iconUrl: 'img/map_pointer.png',
        iconSize: [ 25, 42 ],
        iconAnchor: [ 13, 42 ]
    }
  }

  if (typeof this.featureTitle === 'string') {
    template = twig({ data: this.featureTitle })
    this.featureTitle = function (template, ob) {
      return template.render(ob)
    }.bind(this, template)
  }
  if (typeof this.featureBody === 'string') {
    template = twig({ data: this.featureBody })
    this.featureBody = function (template, ob) {
      return template.render(ob)
    }.bind(this, template)
  }
  if (typeof this.markerSign === 'string') {
    template = twig({ data: this.markerSign })
    this.markerSign = function (template, ob) {
      return template.render(ob)
    }.bind(this, template)
  }
  if (typeof this.style === 'string') {
    template = twig({ data: this.style })
    this.style = function (template, ob) {
      var str = template.render(ob).split('\n')
      var ret = {}

      for (var i = 0; i < str.length; i++) {
        var m
        if ((m = str[i].match(/^\s*([a-zA-Z0-9_]+)\s*:\s*(.*)\s*$/))) {
          ret[m[1]] = m[2]
        }
      }

      return ret
    }.bind(this, template)
  }

  this.visibleFeatures = {}
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
    ob = this.visibleFeatures[k]
    this.map.removeLayer(ob.feature)
    if (ob.featureMarker) {
      this.map.removeLayer(ob.featureMarker)
    }
  }

  this.visibleFeatures = {}

  this.map.off('moveend', this.check_update_map, this)
  this.map = null
}

OverpassLayer.prototype.check_update_map = function () {
  var bounds = new BoundingBox(this.map.getBounds())
  var k
  var ob

  if (this.map.getZoom() < this.minZoom ||
     (this.maxZoom !== null && this.map.getZoom() > this.maxZoom)) {
    for (k in this.visibleFeatures) {
      ob = this.visibleFeatures[k]
      this.map.removeLayer(ob.feature)
      if (ob.featureMarker) {
        this.map.removeLayer(ob.featureMarker)
      }
    }

    this.visibleFeatures = {}
    return
  }

  // Hide loaded but non-visible objects
  for (k in this.visibleFeatures) {
    ob = this.visibleFeatures[k]

    if (!ob.object.intersects(bounds)) {
      this.map.removeLayer(ob.feature)
      if (ob.featureMarker) {
        this.map.removeLayer(ob.featureMarker)
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
  this.currentRequest = this.overpassFrontend.BBoxQuery(this.query, bounds,
    {
      properties: OverpassFrontend.ALL
    },
    function (err, ob) {
      if (!(ob.id in this.visibleFeatures)) {
        var feature

        var style = this.style
        if (typeof this.style === 'function') {
          style = this.style(ob)
        }

        feature = ob.leafletFeature(style)

        var featureMarker
        if (this.marker) {
          var markerHtml = '<img src="' + this.marker.iconUrl + '">'
          if (this.markerSign) {
            markerHtml += '<div>' + this.markerSign(ob) + '</div>'
          }

          this.marker.html = markerHtml
          this.marker.className = 'overpass-layer-icon'
          var icon = L.divIcon(this.marker)

          featureMarker = L.marker(ob.center, { icon: icon })
        }

        var popupContent = ''

        if (typeof this.featureTitle === 'function') {
          popupContent += '<h1>' + this.featureTitle(ob) + '</h1>'
        } else {
          popupContent += this.featureTitle
        }

        if (typeof this.featureBody === 'function') {
          popupContent += '<h1>' + this.featureBody(ob) + '</h1>'
        } else {
          popupContent += this.featureBody
        }

        feature.bindPopup(popupContent)
        if (featureMarker) {
          featureMarker.bindPopup(popupContent)
        }

        this.visibleFeatures[ob.id] = {
          object: ob,
          feature: feature,
          featureMarker: featureMarker
        }

        feature.addTo(this.map)
        if (featureMarker) {
          featureMarker.addTo(this.map)
        }
      }
    }.bind(this),
    function (err) {
      this.currentRequest = null
    }.bind(this)
  )
}

module.exports = OverpassLayer
