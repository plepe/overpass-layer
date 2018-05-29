var overpass_layer4 = new OverpassLayer({
  query: {
    13: '(relation[type=route][route=bicycle][network=rcn];)',
    16: '(relation[type=route][route=bicycle][network=rcn];relation[type=route][route=bicycle][network=lcn];)'
  },
  feature: {
    style:
      "color: {% if tags.network=='rcn' %}red{% else %}green{% endif %} \n" +
      "width: {% if map.zoom>=15 %}5{% else %}3{% endif %}"
  },
  minZoom: 13
})
overpass_layer4.addTo(map)
new OverpassLayerList(document.getElementById('info'), overpass_layer4);
