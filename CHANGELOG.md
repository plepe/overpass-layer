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
