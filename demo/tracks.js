map.createPane('casing')
map.getPane('casing').style.zIndex = 399

const overpassLayer = new OverpassLayer({
  query: 'way[railway=rail];',
  minZoom: 15,
  feature: {
    'style:casing': {
      pane: 'casing',
      color: 'grey',
      width: '3m',
      opacity: 1
    },
    'style:left': {
      color: 'black',
      width: 1,
      offset: '-{{ tags.gauge|default(0) / 2000 / map.metersPerPixel }}'
    },
    'style:right': {
      color: 'black',
      width: 1,
      offset: '{{ tags.gauge|default(0) / 2000 }}m'
    },
    markerSymbol: null,
    styles: ['casing', 'left', 'right'],
    title: '{{ tags.name }}',
    body: function (ob) {
      return '<pre>' + JSON.stringify(ob.tags, null, '  ') + '</pre>'
    }
  }
})
overpassLayer.addTo(map)
