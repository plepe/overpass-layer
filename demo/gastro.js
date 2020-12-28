document.body.classList.add('hasInfo')

const overpassLayer = new OverpassLayer({
  query: '(node[amenity~"^(restaurant|cafe)$"];way[amenity~"^(restaurant|cafe)$"];relation[amenity~"^(restaurant|cafe)$"];);',
  minZoom: 16,
  feature: {
    body: "{{ tags.amenity }}<br/>Cuisine: {{ tags.cuisine|default('unknown') }}",
    'style:highlight': {
      color: 'black',
      opacity: 1,
      radius: 15,
      width: 5,
      fill: false
    },
    style:
      '{% if tags.cuisine == "italian" %}\n' +
      '  color: #003f7f\n' +
      '  fillColor: #003f7f\n' +
      '{% else %}\n' +
      '  color: blue\n' +
      '  fillColor: blue  \n' +
      '{% endif %}\n' +
      'fillOpacity: 0.2\n' +
      'width: 2\n' +
      'radius: 9\n',
    markerSign: '{% if tags.amenity=="restaurant" %}&#127860;{% elseif tags.amenity=="cafe" %}&#9749;{% endif %}'
  }
})
overpassLayer.addTo(map)
overpassLayer.show(
  'w82770794',
  {
    styles: ['highlight']
  },
  function (err, ob) {
    console.log(err, ob)
  })
overpassLayer.show(
  'n597342965',
  {
    styles: ['highlight']
  },
  function (err, ob) {
    console.log(err, ob)
  })
window.setTimeout(function () {
  overpassLayer.hide('w82770794')
  overpassLayer.hide('n597342965')
}, 5000)

const overpassLayerList = new OverpassLayerList(overpassLayer)
overpassLayerList.addTo(document.getElementById('info'))
