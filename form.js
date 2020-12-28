/* global L:false OverpassLayer:false OverpassFrontend:false */
let map
let overpassFrontend
let overpassForm
let overpassLayer

function updateMap () {
  if (overpassLayer) {
    overpassLayer.remove()
  }

  overpassLayer = new OverpassLayer(
    overpassForm.elements.query.value,
    {
      style: overpassForm.elements.style.value,
      overpassFrontend: overpassFrontend,
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

  const osmMapnik = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  )
  osmMapnik.addTo(map)

  overpassForm = document.getElementById('overpass_form')
  overpassForm.onsubmit = updateMap
  updateMap()
}
