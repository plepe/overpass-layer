const OverpassFrontend = require('overpass-frontend')

const OverpassLayer = require('./src/OverpassLayer')
const OverpassLayerList = require('./src/OverpassLayerList')

if (typeof window !== 'undefined') {
  window.OverpassLayer = OverpassLayer
  window.OverpassLayerList = OverpassLayerList
  window.OverpassFrontend = OverpassFrontend
}

OverpassLayer.List = OverpassLayerList
module.exports = OverpassLayer
