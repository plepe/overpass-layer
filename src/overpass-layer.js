var BoundingBox = require('boundingbox')
var twig = require('twig').twig

function OverpassLayer(query, options) {
  if(!options)
    options = {}

  this.query = query
  this.overpassFrontend = 'overpassFrontend' in options ? options.overpassFrontend : overpassFrontend
  this.style = 'style' in options ? options.style : {}
  this.minZoom = 'minZoom' in options ? options.minZoom : 16
  this.maxZoom = 'maxZoom' in options ? options.maxZoom : null
  this.featureTitle = 'featureTitle' in options ? options.featureTitle : function(ob) { return ob.tags.name || ob.tags.operator || ob.tags.ref || ob.id }
  this.featureBody = 'featureBody' in options ? options.featureBody : ''

  if(typeof this.featureTitle == 'string') {
    var template = twig({ data: this.featureTitle })
    this.featureTitle = function(template, ob) {
      return template.render(ob)
    }.bind(this, template)
  }
  if(typeof this.featureBody == 'string') {
    var template = twig({ data: this.featureBody })
    this.featureBody = function(template, ob) {
      return template.render(ob)
    }.bind(this, template)
  }
  if(typeof this.style == 'string') {
    var template = twig({ data: this.style })
    this.style = function(template, ob) {
      var str = template.render(ob).split('\n')
      var ret = {}

      for(var i = 0; i < str.length; i++) {
        var m;
        if(m = str[i].match(/^\s*([a-zA-Z0-9_]+)\s*:\s*(.*)\s*$/))
          ret[m[1]] = m[2]
      }

      return ret
    }.bind(this, template)
  }

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
  this.overpassFrontend.abortAllRequests()

  // Query all trees in the current view
  this.overpassFrontend.BBoxQuery(this.query, bounds,
    {
      properties: OverpassFrontend.ALL
    },
    function (err, ob) {
      if (!ob.feature) {
        var style = this.style
        if(typeof this.style == 'function')
          style = this.style(ob)

        ob.feature = ob.leafletFeature(style)

        var popup_content = ''

        if(typeof this.featureTitle == 'function')
          popup_content += '<h1>' + this.featureTitle(ob) + '</h1>'
        else
          popup_content += this.featureTitle

        if(typeof this.featureBody == 'function')
          popup_content += '<h1>' + this.featureBody(ob) + '</h1>'
        else
          popup_content += this.featureBody

        ob.feature.bindPopup(popup_content)
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
