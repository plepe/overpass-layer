const turf = {
  along: require('@turf/along').default,
  length: require('@turf/length').default,
  pointOnFeature: require('@turf/point-on-feature').default
}

module.exports = function pointOnFeature (ob, leafletFeatureOptions) {
  const geojson = ob.GeoJSON()
  let poi

  if (geojson.geometry.type === 'LineString') {
    poi = turf.along(geojson, turf.length(geojson) / 2)
  } else if (geojson.geometry.type === 'GeometryCollection' && geojson.geometry.geometries.length === 0) {
    return null
  } else {
    poi = turf.pointOnFeature(geojson)
  }

  return {
    lat: poi.geometry.coordinates[1],
    lon: poi.geometry.coordinates[0] + leafletFeatureOptions.shiftWorld[poi.geometry.coordinates[0] < 0 ? 0 : 1]
  }
}
