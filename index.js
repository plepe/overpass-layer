var OverpassLayer = require('./src/overpass-layer.js')
var OverpassFrontend = require('overpass-frontend')

if (typeof window !== 'undefined') {
  window.OverpassLayer = OverpassLayer
  window.OverpassFrontend = OverpassFrontend
}
