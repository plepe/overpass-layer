document.body.classList.add('hasInfo')

const overpassLayer = new OverpassLayer({
  query: '(way[leisure=park];relation[leisure=park];);',
  minZoom: 14,
  feature: {
    style: function (ob) {
      return {
        nodeFeature: 'CircleMarker',
        color: 'green',
        fillColor: 'green',
        fillOpacity: 0.2,
        width: 1,
        radius: 6
      }
    },
    body: function (ob) {
      return '<pre>' + JSON.stringify(ob.tags, null, '  ') + '</pre>'
    }
  }
})

overpassLayer.onLoadStart = function (ev) {
  document.body.classList.add('loading')
}
overpassLayer.onLoadEnd = function (ev) {
  document.body.classList.remove('loading')
}
overpassLayer.addTo(map)

const overpassLayerList = new OverpassLayerList(overpassLayer)
overpassLayerList.addTo(document.getElementById('info'))
