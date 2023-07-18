Version 3.5.0, 2023-07-18
=========================
* Improve performance of popups - only update DOM for active popups
* Add a 'zIndex' parameter to styles
* Accept JSON as feature.style parameter
* Text: handle parameter 'textCenter'

Version 3.4.0, 2022-12-29
=========================
* If value `feature.exclude` evaluates to true, exclude item from the map (and from the list, if `feature.listExclude` is not set).
* Improved README (thanks to @xeruf)

Version 3.3.0, 2022-10-25
=========================
* Now depending on overpass-frontend 3.x

Version 3.2.0, 2022-10-13
=========================
* Move code from Sublayer.js to SublayerFeature.js
* method SublayerFeature.recalc() initiates a re-calc

Version 3.1.0, 2021-12-31
=========================
* Set custom bounds (as GeoJSON polygon / multipolygon) either with the option `bounds` or the function `setBounds()`

Version 3.0.0, 2021-01-06
=========================
* Popup-Content and other layouts are now rendered via Twig
* New setLayout() function

Version 2.6.3, 2020-06-14
=========================
* Markers are now always on the feature (not the centroid)

Version 2.6.2, 2020-06-11
=========================
* License is now MIT

Version 2.6.0, 2020-05-03
=========================
* Allow several patterns for polylines and polygons
* Add lineOffset for patterns
* More style parameters accept a length

Version 2.5.0, 2019-01-03
=========================
* Add a title for each demo
* New demo, showing railway tracks (with the gauge in correct distance)
* Define `map.metersPerPixel` for TwigJS templates (size of a pixel at the map center)
* Allow units for some style parameters (e.g. width, offset). You can now use 'px' (default) or 'm' (meters in world coordinate system).

Version 2.4.0, 2018-03-01
=========================
* Add option 'filter'
* Support for wrapping at lon180

Version 2.2.0, 2018-11-13
=========================
* Enable patterns

Version 1.1.0, 2018-06-27
=========================
* When opening popup from List, try to be smart on the popup location
