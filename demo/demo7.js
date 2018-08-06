document.body.classList.add('hasInfo')

var def = {
  query: {
    11: '(relation[type=route][route~"^(subway|trolley|tram|bus)$"];)'
  },
  members: true,
  feature: {
    styles: [],
    'body': '{% for member in members %}' +
            '{% if member.role|slice(-4) == "stop" %}' +
            '<div data-object="{{ member.id }}" data-sublayer="member"><b>{{ member.tags.name }}</b> ({{ member.id }} as {{ member.role }})</div>' +
            '{% endif %}' +
            '{% endfor %}',
    title: '{{ tags.name }} ({{ tags.network }})',
    listStopsExclude: true
  },
  memberFeature: {
    pre: '{% set prio = 0 %}{% for master in masters %}{% set p = {"icn":4,"ncn":3,"rcn":2,"lcn":1}[master.tags.network] %}{% if p > prio %}{% set prio = p %}{%endif %}{%endfor %}',
    style: {
      color: '{% set master = masters[0] %}' +
             '{{ {"subway":"#0000ff","tram":"#007fff","trolley":"#ff007f","bus":"#ff0000"}[master.tags.route]|default("#000000") }}',
      width: '{% if map.zoom>=15 %}5{% else %}3{% endif %}'
    },
    title: '{% if tags.public_transport == "stop_position" %}{{ tags.name }}{% endif %}',
    listStopsTitle: '{{ tags.name }}: {% for master in masters %}{{ master.tags.ref }} {% endfor %}',
    body: '{% for master in masters %}' +
          '<div data-object="{{ master.id }}"><b>{{ master.tags.name|default(master.tags.ref) }}</b> ({{ master.id }})</div>' +
          '{% endfor %}',
    listRoutesExclude: true,
    listStopsExclude: '{% set isStop = 0 %}{% for master in masters %}{% if master.role|slice(-4) == "stop" %}{% set isStop = 1 %}{% endif %}{% endfor %}{{ not isStop }}'
  },
  minZoom: 13
}

/* enable for list of stops */

var overpassLayer = new OverpassLayer(def)
overpassLayer.addTo(map)

var listStops = document.createElement('div')
document.getElementById('info').appendChild(listStops)

var overpassLayerStopsList = new OverpassLayerList(overpassLayer, {
  prefix: 'listStops'
})
overpassLayerStopsList.addTo(listStops)

var listRoutes = document.createElement('div')
document.getElementById('info').appendChild(listRoutes)

var overpassLayerRoutesList = new OverpassLayerList(overpassLayer, {
  prefix: 'listRoutes'
})
overpassLayerRoutesList.addTo(listRoutes)
