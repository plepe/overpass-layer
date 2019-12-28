var overpassLayer = new OverpassLayer({
  query: 'node[natural=tree];',
  minZoom: 17,
  feature: {
    style: {
      nodeFeature: 'CircleMarker',
      color: 'red',
      fillColor: 'red',
      fillOpacity: 0.1,
      width: 1,
      radius: 6
    },
    markerSymbol: "<img src='img/map_pointer.png' width='25' height='42' anchorX='13' anchorY='42' signAnchorX='0' signAnchorY='-30'>",
    title: '{{ tags.species|default("Tree") }}',
    markerSign: '<span style="font-size: 20px;">🌳</span>',
    body: function (ob) {
      return '<pre>' + JSON.stringify(ob.tags, null, '  ') + '</pre>'
    }
  }
})

overpassLayer.addTo(map)
