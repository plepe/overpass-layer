var overpass_layer2 = new OverpassLayer({
  query: '(way[leisure=park];relation[leisure=park];);',
  minZoom: 14,
  feature: {
    style: function(ob) {
      return {
          nodeFeature: 'CircleMarker',
          color: 'green',
          fillColor: 'green',
          fillOpacity: 0.2,
          width: 1,
          radius: 6
      }
    },
    body: function(ob) {
      return '<pre>' + JSON.stringify(ob.tags, null, '  ') + '</pre>'
    }
  }
})
overpass_layer2.onLoadStart = function (ev) {
  document.body.classList.add('loading')
}
overpass_layer2.onLoadEnd = function (ev) {
  document.body.classList.remove('loading')
}
overpass_layer2.addTo(map)
new OverpassLayerList(document.getElementById('info'), overpass_layer2);
