var overpass_layer = new OverpassLayer({
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
    markerSymbol: "<div style='background: red; border: 1px solid black; height: 50px;' width='10' height='50' anchorX='5' anchorY='25' signAnchorX='0' signAnchorY='0'></div>",
    markerSign: '<span style="font-size: 20px;">🌳</span>',
    body: function(ob) {
      return '<pre>' + JSON.stringify(ob.tags, null, '  ') + '</pre>'
    }
  }
})
overpass_layer.addTo(map)
