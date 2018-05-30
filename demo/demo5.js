map.createPane('casing');
map.getPane('casing').style.zIndex = 399;

var overpass_layer = new OverpassLayer({
  query: 'way[highway];',
  minZoom: 15,
  feature: {
    "style:casing": {
          pane: "casing",
          color: 'black',
          width: 12,
          opacity: 1
    },
    style: {
          color: 'white',
          width: 8,
          opacity: 1
    },
    markerSymbol: null,
    styles: [ 'casing', 'default' ],
    title: '{{ tags.name }}',
    body: function(ob) {
      return '<pre>' + JSON.stringify(ob.tags, null, '  ') + '</pre>'
    }
  }
})
overpass_layer.addTo(map)
