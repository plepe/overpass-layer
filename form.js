/* global L:false */
var map
var overpassFrontend
var overpassForm
var overpassLayer

function updateMap () {
  if (overpassLayer) {
    overpassLayer.remove()
  }

  overpassLayer = new OverpassLayer(
    overpassForm.elements.query.value,
    {
      style: overpassForm.elements.style.value,
      featureBody: function (ob) {
        return '<pre>' + JSON.stringify(ob.tags, null, '  ') + '</pre>'
      }
    }
  )
  overpassLayer.addTo(map)

  return false
}

window.onload = function () {
  map = L.map('map').setView([51.505, -0.09], 18)
  overpassFrontend = new OverpassFrontend('http://api.openstreetmap.fr/oapi/interpreter', {
    timeGap: 10,
    effortPerRequest: 100
  })

  var osm_mapnik = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  )
  osm_mapnik.addTo(map)

  overpassForm = document.getElementById('overpass_form')
  overpassForm.onsubmit = updateMap
  updateMap()
}
