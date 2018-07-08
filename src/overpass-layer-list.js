require('./overpass-layer-list.css')

var isTrue = require('./isTrue')

function OverpassLayerList (layer, options) {
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
  this.options = options
  this.options.prefix = this.options.prefix || 'list'

  this.layer.on('add', (ob, data) => this.addObject(data))
  this.layer.on('update', (ob, data) => this.updateObject(data))
  this.layer.on('remove', (ob, data) => this.delObject(data))

  this.items = {}

  if (parentDom) {
    this.addTo(parentDom)
  }
}

OverpassLayerList.prototype.addTo = function (parentDom) {
  parentDom.appendChild(this.dom)
}

OverpassLayerList.prototype._getMarker = function (ob) {
  var a

  if (ob.data[this.options.prefix + 'MarkerSymbol']) {
    a = document.createElement('div')
    a.className = 'marker'
    a.innerHTML = ob.data[this.options.prefix + 'MarkerSymbol']
  } else if (ob.data.markerSymbol) {
    a = document.createElement('div')
    a.className = 'marker'
    a.innerHTML = ob.data.markerSymbol
  } else if (ob.data.marker && ob.data.marker.iconUrl) {
    a = document.createElement('img')
    a.className = 'marker'
    a.src = ob.data.marker.iconUrl
  }

  return a
}

OverpassLayerList.prototype.addObject = function (ob) {
  if (isTrue(ob.data[this.options.prefix + 'Exclude'])) {
    return
  }

  if (ob.id in this.items) { // already added
    return
  }

  var div = document.createElement('li')
  var a

  this.items[ob.id] = div
  ob[this.options.prefix + 'Item'] = div

  // MARKER&ICON PARENT
  var p = document.createElement('a')
  p.className = 'markerParent'
  p.href = 'appUrl' in ob.data ? ob.data.appUrl : '#'
  p.onclick = function (ob) {
    this.layer.openPopupOnObject(ob)
    return false
  }.bind(this, ob)
  div.appendChild(p)

  // MARKER
  a = this._getMarker(ob)
  if (a) {
    p.appendChild(a)
  }

  // ICON
  a = document.createElement('div')
  a.className = 'icon'
  if (ob.data[this.options.prefix + 'MarkerSign']) {
    a.innerHTML = ob.data[this.options.prefix + 'MarkerSign']
  } else if (ob.data.markerSign) {
    a.innerHTML = ob.data.markerSign
  }
  p.appendChild(a)

  // TITLE
  a = document.createElement('a')
  a.className = 'title'
  a.href = 'appUrl' in ob.data ? ob.data.appUrl : '#'
  a.onclick = function (ob) {
    this.layer.openPopupOnObject(ob)
    return false
  }.bind(this, ob)
  a.innerHTML = ob.data[this.options.prefix + 'Title'] || ob.data.title
  div.appendChild(a)

  // DESCRIPTION
  a = document.createElement('div')
  a.className = 'description'
  a.innerHTML = 'description' in ob.data ? ob.data.description : ''
  div.appendChild(a)

  div.priority = 'priority' in ob.data ? parseFloat(ob.data.priority) : 0

  var current = this.dom.firstChild
  while (current && current.priority <= div.priority) {
    current = current.nextSibling
  }

  if (current) {
    this.dom.insertBefore(div, current)
  } else {
    this.dom.appendChild(div)
  }

  this.layer.updateAssets(this.dom, ob.data)

  ob[this.options.prefix + 'Item'].onmouseover = function (id, sublayer_id) {
    if (this.currentHover) {
      this.currentHover.hide()
    }

    this.currentHover = this.layer.show(id, { styles: [ 'hover' ], sublayer_id },
      (err, ob, data) => {
        console.log(err, ob, data)
      }
    )
  }.bind(this, ob.id, ob.sublayer_id)

  ob[this.options.prefix + 'Item'].onmouseout = function (id, sublayer_id) {
    if (this.currentHover) {
      this.currentHover.hide()
    }

    this.currentHover = null
  }.bind(this, ob.id, ob.sublayer_id)
}

OverpassLayerList.prototype.updateObject = function (ob) {
  var listExclude = isTrue(ob.data[this.options.prefix + 'Exclude'])

  if (!(ob.id in this.items) && !listExclude) {
    return this.addObject(ob)
  }

  if (listExclude) {
    return this.delObject(ob)
  }

  var div = this.items[ob.id]
  var p = div.firstChild
  while (p) {
    if (p.className === 'markerParent') {
      var a = p.firstChild
      while (a) {
        // MARKER
        if (a.className === 'marker') {
          while (p.lastChild) {
            p.removeChild(p.lastChild)
          }

          a = this._getMarker(ob)
          p.appendChild(a)
        }

        // ICON
        a = document.createElement('div')
        a.className = 'icon'
        if (ob.data[this.options.prefix + 'MarkerSign']) {
          a.innerHTML = ob.data[this.options.prefix + 'MarkerSign']
        } else if (ob.data.markerSign) {
          a.innerHTML = ob.data.markerSign
        }
        p.appendChild(a)

        a = a.nextSibling
      }
    }

    // TITLE
    if (p.className === 'title') {
      p.innerHTML = ob.data[this.options.prefix + 'Title'] || ob.data.title || ''
    }

    // TITLE
    if (p.className === 'description') {
      p.innerHTML = ob.data.description || ''
    }

    p = p.nextSibling
  }

  this.layer.updateAssets(div, ob.data)
}

OverpassLayerList.prototype.delObject = function (ob) {
  var div = this.items[ob.id]

  if (div) {
    this.dom.removeChild(div)
  }

  delete this.items[ob.id]
  delete ob[this.options.prefix + 'Item']
}

OverpassLayerList.prototype.remove = function () {
  while (this.dom.firstChild) {
    this.dom.removeChild(this.dom.lastChild)
  }

  for (var k in this.items) {
    delete this.items[k][this.options.prefix + 'Item']
  }

  this.items = {}
}

module.exports = OverpassLayerList
