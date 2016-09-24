var BoundingBox = require('boundingbox')

function OverpassLayer(query, options) {
  if(!options)
    options = {}

  this.query = query
  this.overpass = 'overpass' in options ? options.overpass : overpass
  this.style = 'style' in options ? options.style : {}
  this.minZoom = 'minZoom' in options ? options.minZoom : 16
  this.maxZoom = 'maxZoom' in options ? options.maxZoom : null

  this.visible_features = {}
}

OverpassLayer.prototype.addTo = function(map) {
  this.map = map
  this.map.on('moveend', this.check_update_map.bind(this))
  this.check_update_map()
}

OverpassLayer.prototype.check_update_map = function() {
  var bounds = new BoundingBox(this.map.getBounds())

  if(this.map.getZoom() < this.minZoom ||
     (this.maxZoom !== null && this.map.getZoom() > this.maxZoom)) {
    for (var k in this.visible_features) {
      var ob = this.visible_features[k]
      map.removeLayer(ob.feature)
    }

    this.visible_features = {}
    return
  }

  // Hide loaded but non-visible objects
  for (var k in this.visible_features) {
    var ob = this.visible_features[k]

    if (!ob.isVisible(bounds)) {
      map.removeLayer(ob.feature)
      delete(this.visible_features[k])
    }
  }

  // Abort current requests (in case they are long-lasting - we don't need them
  // anyway). Data which is being submitted will still be loaded to the cache.
  this.overpass.abort_all_requests()

  // Query all trees in the current view
  this.overpass.bbox_query(this.query, bounds,
    {
      properties: Overpass.ALL
    },
    function (err, ob) {
      if (!ob.feature) {
        var style = this.style
        if(typeof this.style == 'function')
          style = this.style(ob)

        ob.feature = ob.leafletFeature(style)
        // ob.feature.bindPopup('<pre>' + escapeHtml(JSON.stringify(ob.GeoJSON(), null, '  ')) + '</pre>')
      }
      
      ob.feature.addTo(map)
      this.visible_features[ob.id] = ob
    }.bind(this),
    function (err) {
    }.bind(this)
  )
}

if(typeof module != 'undefined' && module.exports)
  module.exports = OverpassLayer
if(typeof window != 'undefined')
  window.OverpassLayer = OverpassLayer
