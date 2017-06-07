/* global overpassFrontend:false */

var BoundingBox = require('boundingbox')
var twig = require('twig').twig
var OverpassFrontend = require('overpass-frontend')

function OverpassLayer (query, options) {
  var template

  if (!options) {
    options = {}
  }

  this.options = options

  this.query = query
  this.overpassFrontend = 'overpassFrontend' in this.options ? this.options.overpassFrontend : overpassFrontend
  this.options.style = 'style' in this.options ? this.options.style : {}
  this.options.minZoom = 'minZoom' in this.options ? this.options.minZoom : 16
  this.options.maxZoom = 'maxZoom' in this.options ? this.options.maxZoom : null
  this.options.featureTitle = 'featureTitle' in this.options ? this.options.featureTitle : function (ob) { return ob.tags.name || ob.tags.operator || ob.tags.ref || ob.id }
  this.options.featureBody = 'featureBody' in this.options ? this.options.featureBody : ''
  this.options.marker = 'marker' in this.options ? this.options.marker : null
  this.options.markerSign = 'markerSign' in this.options ? this.options.markerSign : null
  if (this.options.marker === null && this.options.markerSign !== null) {
    this.options.marker = {
        iconUrl: 'img/map_pointer.png',
        iconSize: [ 25, 42 ],
        iconAnchor: [ 13, 42 ]
    }
  }

  for (var k in this.options) {
    if (typeof this.options[k] === 'string') {
      template = twig({ data: this.options[k] })
      this.options[k] = function (template, ob) {
        return template.render(ob)
      }.bind(this, template)
    }
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

  if (this.map.getZoom() < this.options.minZoom ||
     (this.options.maxZoom !== null && this.map.getZoom() > this.options.maxZoom)) {
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

        var style = this.options.style
        if (typeof this.options.style === 'function') {
          style = this.options.style(ob)

          if (typeof style === 'string') {
            var str = style.split('\n')
            style = {}

            for (var i = 0; i < str.length; i++) {
              var m
              if ((m = str[i].match(/^\s*([a-zA-Z0-9_]+)\s*:\s*(.*)\s*$/))) {
                style[m[1]] = m[2]
              }
            }
          }
        }

        feature = ob.leafletFeature(style)

        var featureMarker
        if (this.options.marker) {
          var markerHtml = '<img src="' + this.options.marker.iconUrl + '">'
          if (this.options.markerSign) {
            markerHtml += '<div>' + this.options.markerSign(ob) + '</div>'
          }

          this.options.marker.html = markerHtml
          this.options.marker.className = 'overpass-layer-icon'
          var icon = L.divIcon(this.options.marker)

          featureMarker = L.marker(ob.center, { icon: icon })
        }

        var popupContent = ''

        if (typeof this.options.featureTitle === 'function') {
          popupContent += '<h1>' + this.options.featureTitle(ob) + '</h1>'
        } else {
          popupContent += this.options.featureTitle
        }

        if (typeof this.options.featureBody === 'function') {
          popupContent += '<h1>' + this.options.featureBody(ob) + '</h1>'
        } else {
          popupContent += this.options.featureBody
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
