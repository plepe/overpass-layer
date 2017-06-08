var OverpassLayer = require('./src/overpass-layer.js')
var OverpassLayerList = require('./src/overpass-layer-list.js')
var OverpassFrontend = require('overpass-frontend')

if (typeof window !== 'undefined') {
  window.OverpassLayer = OverpassLayer
  window.OverpassLayerList = OverpassLayerList
  window.OverpassFrontend = OverpassFrontend
}
