map.createPane('casing')
map.getPane('casing').style.zIndex = 399

const highwayStylesLow = {
  motorway: { width: 8, color: '#ff0000' },
  motorway_link: { width: 4, color: '#ff0000' },
  trunk: { width: 6, color: '#ff3f00' },
  trunk_link: { width: 4, color: '#ff3f00' },
  primary: { width: 4, color: '#ff7f00' },
  primary_link: { width: 3, color: '#ff7f00' },
  secondary: { width: 4, color: '#ffaf00' },
  secondary_link: { width: 3, color: '#ffaf00' },
  tertiary: { width: 4, color: '#ffff00' },
  tertiary_link: { width: 3, color: '#ffff00' },
  default: { width: 3, color: '#ffffff' }
}

const highwayStylesHigh = {
  motorway: { width: 12, color: '#ff0000' },
  motorway_link: { width: 8, color: '#ff0000' },
  trunk: { width: 10, color: '#ff3f00' },
  trunk_link: { width: 6, color: '#ff3f00' },
  primary: { width: 8, color: '#ff7f00' },
  primary_link: { width: 4, color: '#ff7f00' },
  secondary: { width: 7, color: '#ffaf00' },
  secondary_link: { width: 4, color: '#ffaf00' },
  tertiary: { width: 6, color: '#ffff00' },
  tertiary_link: { width: 4, color: '#ffff00' },
  footway: { width: 2, color: '#afafaf' },
  cycleway: { width: 2, color: '#afafaf' },
  bridleway: { width: 2, color: '#afafaf' },
  path: { width: 2, color: '#7f3f00' },
  default: { width: 4, color: '#ffffff' }
}

const overpassLayer = new OverpassLayer({
  // different queries for different zoom levels
  minZoom: 12,
  query: {
    12: 'way[highway~"^(motorway|trunk)"];',
    14: 'way[highway~"^(motorway|trunk|primary|secondary|tertiary)"];',
    16: 'way[highway];'
  },
  feature: {
    // the 'pre' function will be called before other scripts
    // in this case, we assign 'current' a style from highwayStyles
    pre: function (v) {
      const highwayStyles = v.map.zoom < 16 ? highwayStylesLow : highwayStylesHigh

      if (v.tags.highway in highwayStyles) {
        v.current = highwayStyles[v.tags.highway]
      } else {
        v.current = highwayStyles.default
      }
    },
    // the casing is the border around the roads - in fact it's a
    // thicker line which will be painted over in the center
    'style:casing': {
      pane: 'casing',
      color: 'black',
      width: '{{ current.width + 3 }}',
      opacity: 1
    },
    // the inner color of the road
    'style:default': {
      color: '{{ current.color }}',
      width: '{{ current.width }}',
      opacity: 1
    },
    markerSymbol: null,
    styles: ['casing', 'default'],
    title: '{{ tags.name }}',
    body: function (ob) {
      return '<pre>' + JSON.stringify(ob.tags, null, '  ') + '</pre>'
    }
  }
})
overpassLayer.addTo(map)
