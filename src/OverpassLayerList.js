/* eslint camelcase: 0 */

require('./OverpassLayerList.css')

const isTrue = require('./isTrue')

class OverpassLayerList {
  constructor (layer, options) {
    // compatibility <1.0
    let parentDom
    if (arguments.length > 1 && arguments[1].constructor.name === 'OverpassLayer') {
      parentDom = arguments[0]
      layer = arguments[1]
      console.error('overpass-layer: class OverpassLayerList() accepts only one parameter, "layer"')
    }
    // end

    this.dom = document.createElement('ul')
    this.dom.className = 'overpass-layer-list'
    this.layer = layer
    this.options = options || {}
    this.options.prefix = this.options.prefix || 'list'
    this.selectedId = null

    const prefix = this.options.prefix
    if (!(prefix in this.layer.options.layouts)) {
      this.layer.setLayout(prefix,
        '<div class="marker">' +
        '{% if object.' + prefix + 'MarkerSymbol or object.markerSymbol %}' +
        '<div class="symbol">{{ object.' + prefix + 'MarkerSymbol|default(object.markerSymbol) }}</div>' +
        '{% elseif object.marker and object.marker.iconUrl %}' +
        '<img class="symbol" src="{{ object.marker.iconUrl|e }}">' +
        '{% endif %}' +
        '{% if object.' + prefix + 'MarkerSign or object.markerSign %}' +
        '<div class="sign">{{ object.' + prefix + 'MarkerSign|default(object.markerSign) }}</div>' +
        '{% endif %}' +
        '</div>' +
        '<div class="content">' +
        '<a class="title" href="{{ object.appUrl|default("#") }}">{{ object.' + prefix + 'Title|default(object.title) }}</a>' +
        '{% if object.' + prefix + 'Description or object.description %}<div class="description">{{ object.' + prefix + 'Description|default(object.description) }}</div>{% endif %}' +
        '</div>'
      )
    }

    this.layer.on('add', (ob, data) => this.addObject(data))
    this.layer.on('update', (ob, data) => this.updateObject(data))
    this.layer.on('remove', (ob, data) => this.delObject(data))
    this.layer.on('selectObject', (ob, data) => {
      this.selectedId = ob.id
      this.updateObject(data)
    })
    this.layer.on('unselectObject', (ob, data) => {
      this.selectedId = null
      this.updateObject(data)
    })

    this.items = {}

    if (parentDom) {
      this.addTo(parentDom)
    }
  }

  addTo (parentDom) {
    parentDom.appendChild(this.dom)
  }

  addObject (ob) {
    if (isTrue(ob.data[this.options.prefix + 'Exclude'])) {
      return
    }

    if (ob.id in this.items) { // already added
      return
    }

    const div = document.createElement('li')

    if (this.selectedId === ob.id) {
      div.classList.add('selected')
    }

    this.items[ob.id] = div
    ob[this.options.prefix + 'Item'] = div

    // CONTENT
    const html = ob.layouts[this.options.prefix] || ob.layouts.list || ''
    div.innerHTML = html
    div.currentHTML = html

    div.priority = 'priority' in ob.data ? parseFloat(ob.data.priority) : 0

    let current = this.dom.firstChild
    while (current && current.priority <= div.priority) {
      current = current.nextSibling
    }

    if (current) {
      this.dom.insertBefore(div, current)
    } else {
      this.dom.appendChild(div)
    }

    ob.sublayer.updateAssets(div, ob.data)

    div.onmouseover = function (id, sublayer_id) {
      if (this.currentHover) {
        this.currentHover.hide()
      }

      this.currentHover = this.layer.show(id,
        {
          styles: ['hover'],
          flags: ['hover'],
          sublayer_id
        },
        () => {}
      )
    }.bind(this, ob.id, ob.sublayer_id)

    div.onmouseout = function (id, sublayer_id) {
      if (this.currentHover) {
        this.currentHover.hide()
      }

      this.currentHover = null
    }.bind(this, ob.id, ob.sublayer_id)

    div.onclick = function (ob) {
      this.layer.openPopupOnObject(ob)
      return false
    }.bind(this, ob)
  }

  updateObject (ob) {
    const listExclude = isTrue(ob.data[this.options.prefix + 'Exclude'])

    if (!(ob.id in this.items) && !listExclude) {
      return
    }

    if (listExclude) {
      return this.delObject(ob)
    }

    const div = this.items[ob.id]

    if (this.selectedId === ob.id) {
      div.classList.add('selected')
    } else {
      div.classList.remove('selected')
    }

    // CONTENT
    //if (div.className === 'content') {
      const html = ob.layouts[this.options.prefix] || ob.layouts.list || ''
      if (div.currentHTML !== html) {
        div.innerHTML = html
        div.currentHTML = html
      }
    //}

    ob.sublayer.updateAssets(div, ob.data)
  }

  delObject (ob) {
    const div = this.items[ob.id]

    if (div) {
      this.dom.removeChild(div)
    }

    delete this.items[ob.id]
    delete ob[this.options.prefix + 'Item']
  }

  remove () {
    while (this.dom.firstChild) {
      this.dom.removeChild(this.dom.lastChild)
    }

    for (const k in this.items) {
      delete this.items[k][this.options.prefix + 'Item']
    }

    this.items = {}
  }
}

module.exports = OverpassLayerList
