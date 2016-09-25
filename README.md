# overpass-layer
Show a Leaflet layer using OpenStreetMap data from Overpass API via OverpassFrontend.

# API
## constructor OverpassLayer(query, options)
Create a Layer with an Overpass query and optional options.

Parameters:
* query: e.g. `node[natural=tree];`. Combine queries with: `(way[building];relation[building];);`
* options: an object, see below.

Options:
* overpass: An OverpassFrontend object (defaults to the global variable `overpass`)
* style: An object, styling the result. E.g.: { weight: 2, fillColor: 'red' } or a style function. The function will be passed the OverpassObject object and should return the style.
* minZoom: Show layer only from the given zoom level (default: 16)
* maxZoom: Show layer only up to the given zoom level (default: no limit)
* featureTitle: the title of the feature popup. Either a function (which will be passed the OverpassObject object; return HTML text) or a template for TwigJS.
* featureBody: the body of the feature popup. Either a function (which will be passed the OverpassObject object; return HTML text) or a template for TwigJS.

TwigJS templates

The data of an object is available as patterns. Tags and Meta information is only available, if these properties have been downloaded (see option 'properties').

* `id` (the id of the object is always available, prefixed 'n' for nodes, 'w' for ways and 'r' for relations; e.g. 'n1234')
* `osm_id` (the numerical id of the object)
* `type` ('node', 'way' or 'relation')
* `tags.*` (all tags are available with the prefix `tags.`, e.g. `tags.amenity`)
* `meta.timestamp` (timestamp of last modification)
* `meta.version` (version of the object)
* `meta.changeset` (ID of the changeset, the object was last modified in)
* `meta.user` (Username of the user, who changed the object last)
* `meta.uid` (UID of the user, who changed the object last)

## method addTo(map)
Add layer to the given map.
