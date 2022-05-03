const turf = {
  along: require('@turf/along').default,
  center: require('@turf/center').default,
  distance: require('@turf/distance').default,
  length: require('@turf/length').default,
  pointOnFeature: require('@turf/point-on-feature').default
}

function pointOnGeoJSON (geojson) {
  if (geojson.type === 'FeatureCollection') {
    if (!geojson.features.length) {
      return null
    }

    const pois = geojson.features
      .map(f => pointOnGeoJSON(f))
      .filter(p => p)
    const centroid = turf.center(geojson)
    const dists = pois.map(p => turf.distance(centroid, p))
    const minIndex = dists.indexOf(Math.min(...dists))
    return pois[minIndex]
  } else if (geojson.geometry.type === 'LineString') {
    return turf.along(geojson, turf.length(geojson) / 2)
  } else if (geojson.geometry.type === 'GeometryCollection' && geojson.geometry.geometries.length === 0) {
    return null
  } else {
    return turf.pointOnFeature(geojson)
  }
}

module.exports = function pointOnFeature (ob, leafletFeatureOptions) {
  const poi = pointOnGeoJSON(ob.GeoJSON())

  if (!poi) {
    return null
  }

  return {
    lat: poi.geometry.coordinates[1],
    lon: poi.geometry.coordinates[0] + leafletFeatureOptions.shiftWorld[poi.geometry.coordinates[0] < 0 ? 0 : 1]
  }
}
