document.body.classList.add('hasInfo')

const overpassLayer = new OverpassLayer({
  query: {
    11: '(relation[type=route][route=bicycle][network~"^(icn|ncn)$"];)',
    13: '(relation[type=route][route=bicycle][network~"^(icn|ncn|rcn)$"];)',
    16: '(relation[type=route][route=bicycle];)'
  },
  members: true,
  feature: {
    pre: '{% set prio = {"icn":4,"ncn":3,"rcn":2,"lcn":1}[tags.network] %}',
    styles: [],
    body: '{% for member in members %}<div object="{{ member.id }}" sublayer="member">{{ member.id }} ({{ member.visible }}) {{ member.tags.highway }}</div>{% endfor %}',
    title: '{{ tags.name }} ({{ tags.network }})',
    priority: '{{ 5 - prio }}'
  },
  memberFeature: {
    pre: '{% set prio = 0 %}{% for master in masters %}{% set p = {"icn":4,"ncn":3,"rcn":2,"lcn":1}[master.tags.network] %}{% if p > prio %}{% set prio = p %}{%endif %}{%endfor %}',
    style: {
      color: '{{ {4:"#b400ff",3:"red",2:"magenta",1:"blue",0:"black"}[prio] }}',
      width: '{% if map.zoom>=15 %}5{% else %}3{% endif %}'
    },
    title: '{{ id }} {{ prio }}',
    body: '{% for master in masters %}<div object="{{ master.id }}">{{ master.id }}: {{ master.tags.name }}</div>{% endfor %}',
    listExclude: true
  },
  minZoom: 13
})
overpassLayer.addTo(map)

const overpassLayerList = new OverpassLayerList(overpassLayer)
overpassLayerList.addTo(document.getElementById('info'))
