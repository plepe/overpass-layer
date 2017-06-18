# overpass-layer
Show a Leaflet layer using OpenStreetMap data from Overpass API via overpass-frontend.

# API
## constructor OverpassLayer(options)
Create a Layer with an Overpass query and optional options.

Options:
* query: e.g. `node[natural=tree];`. Combine queries with: `(way[building];relation[building];);`. Optionally zoom-dependend queries can be given by using an object with the minimum zoom level as index, e.g. `{ 13: 'way[landuse=forest]', 15: '(way[landuse=forest];node[natural=tree];)' }`: zoom levels 13 and 14 all forests will be shown, from zoom level 15 all forests and trees.
* overpassFrontend: An OverpassFrontend object (defaults to the global variable `overpassFrontend`)
* minZoom: Show layer only from the given zoom level (default: 16)
* maxZoom: Show layer only up to the given zoom level (default: no limit)
* feature: an object describing how the feature will be formated resp. styled. Each of the values may be either a function which will be passed an OverpassObject or a string which will be processed with the templating language TwigJS:
  * style: An object or a function or a TwigJS template (string), styling the resulting map feature.
    * If an object is used, e.g.: { weight: 2, fillColor: 'red' }
    * If a function is used, the function will be passed the OverpassObject object and should return the style as object.
    * If a TwigJS template is used, the template should create lines with "key: value" (E.g. `color: red\nweight: 2`). See below for possible patterns.
  * title: the title of the feature popup.
  * body: the body of the feature popup.
  * marker: an icon definition for L.icon (if boolean true or iconSign defined use standard map marker)
  * markerSign: a HTML string which will be shown within the icon.

### TwigJS templates
The data of an object is available as patterns. Tags and Meta information is only available, if these properties have been downloaded (see option 'properties'). Variables will automatically be HTML escaped, if not the filter `raw` is used, e.g.: `{{ tags.name|raw }}`.

The templates will be rendered when the object becomes visible and when the zoom level changes.

* `id` (the id of the object is always available, prefixed 'n' for nodes, 'w' for ways and 'r' for relations; e.g. 'n1234')
* `osm_id` (the numerical id of the object)
* `type` ('node', 'way' or 'relation')
* `tags.*` (all tags are available with the prefix `tags.`, e.g. `tags.amenity`)
* `meta.timestamp` (timestamp of last modification)
* `meta.version` (version of the object)
* `meta.changeset` (ID of the changeset, the object was last modified in)
* `meta.user` (Username of the user, who changed the object last)
* `meta.uid` (UID of the user, who changed the object last)
* `map.zoom` (Current zoom level)

Examples:
`Amenity: {{ tags.amenity }}`: might render as "Amenity: restaurant"
`{% if tags.cuisine=='pizza' %}🍕{% else %}🍴{% endif %}`: might render as "🍴"
`{% for k, v in tags %}{{ k }}: {{ v }}<br/>{% endfor %}`: list all tags with "key: value"
`<a href="{{ tags.website }}">{{ tags.name }}</a>`: Create a HTML link to the website with the tag `name` as title.

## method addTo(map)
Add layer to the given map.

## method remove()
Removes the OverpassLayer and all its features.

## event onAppear(ob)
Will be called when an object appears on the map (e.g. load from server, zoom in, viewport moves in)

Parameter:
* `ob.id`: Unique ID of the object (e.g. 'w1234')
* `ob.object` is an instance of OSMObject (see OverpassFrontend for details)
* `ob.data` are the parsed options for the current object.
* `ob.feature`: the leaflet feature which currently highlights the object
* `ob.featureMarker`: the leaflet marker, if a marker is shown on the object

## event onDisappear(ob)
Will be called when an object disappears from the map (e.g. zoom out, pan out, ...)

See `onAppear` for the description of parameters.
