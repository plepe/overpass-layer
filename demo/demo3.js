var overpass_layer3 = new OverpassLayer({
  query: '(node[amenity~"^(restaurant|cafe)$"];way[amenity~"^(restaurant|cafe)$"];relation[amenity~"^(restaurant|cafe)$"];);',
  minZoom: 16,
  feature: {
    body: "{{ tags.amenity }}<br/>Cuisine: {{ tags.cuisine|default('unknown') }}",
    'style:highlight': {
      "color": "black",
      "opacity": 1,
      "radius": 15,
      "width": 5,
      "fill": false
    },
    style:
      "{% if tags.cuisine == 'italian' %}\n" +
      "  color: #003f7f\n" +
      "  fillColor: #003f7f\n" +
      "{% else %}\n" +
      "  color: blue\n" +
      "  fillColor: blue  \n" +
      "{% endif %}\n" +
      "fillOpacity: 0.2\n" +
      "width: 2\n" +
      "radius: 9\n",
    markerSign: '{% if tags.amenity=="restaurant" %}&#127860;{% elseif tags.amenity=="cafe" %}&#9749;{% endif %}'
  }
})
overpass_layer3.addTo(map)
overpass_layer3.show(
  'w82770794',
  {
    'styles': [ 'highlight' ]
  },
  function (err, ob) {
    console.log(ob)
  })
overpass_layer3.show(
  'n597342965',
  {
    'styles': [ 'highlight' ]
  },
  function (err, ob) {
    console.log(ob)
  })
window.setTimeout(function () {
  overpass_layer3.hide('w82770794')
  overpass_layer3.hide('n597342965')
}, 5000)
new OverpassLayerList(document.getElementById('info'), overpass_layer3);
