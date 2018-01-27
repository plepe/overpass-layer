require('./overpass-layer-list.css')

var isTrue = require('./isTrue')

function OverpassLayerList (parentDom, layer) {
  this.layer = layer
  this.layer.layerList = this
  this.dom = document.createElement('ul')
  this.dom.className = 'overpass-layer-list'
  parentDom.appendChild(this.dom)
  this.items = {}
}

OverpassLayerList.prototype._getMarker = function (ob) {
  var a

  if (ob.data.listMarkerSymbol) {
    a = document.createElement('div')
    a.className = 'marker'
    a.innerHTML = ob.data.listMarkerSymbol
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
  if (isTrue(ob.data.listExclude)) {
    return
  }

  if (ob.id in this.items) { // already added
    return
  }

  var div = document.createElement('li')
  var a

  this.items[ob.id] = div
  ob.listItem = div

  // MARKER&ICON PARENT
  var p = document.createElement('a')
  p.className = 'markerParent'
  p.href = 'appUrl' in ob.data ? ob.data.appUrl : '#'
  p.onclick = function (ob) {
    ob.feature.openPopup()
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
  if (ob.data.listMarkerSign) {
    a.innerHTML = ob.data.listMarkerSign
  } else if (ob.data.markerSign) {
    a.innerHTML = ob.data.markerSign
  }
  p.appendChild(a)

  // TITLE
  a = document.createElement('a')
  a.className = 'title'
  a.href = 'appUrl' in ob.data ? ob.data.appUrl : '#'
  a.onclick = function (ob) {
    ob.feature.openPopup()
    return false
  }.bind(this, ob)
  a.innerHTML = ob.data.title
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
}

OverpassLayerList.prototype.updateObject = function (ob) {
  var listExclude = isTrue(ob.data.listExclude)

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
        if (ob.data.listMarkerSign) {
          a.innerHTML = ob.data.listMarkerSign
        } else if (ob.data.markerSign) {
          a.innerHTML = ob.data.markerSign
        }
        p.appendChild(a)

        a = a.nextSibling
      }
    }

    // TITLE
    if (p.className === 'title') {
      p.innerHTML = ob.data.title
    }

    // TITLE
    if (p.className === 'description') {
      p.innerHTML = ob.data.description
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
  delete ob.listItem
}

OverpassLayerList.prototype.remove = function () {
  while (this.dom.firstChild) {
    this.dom.removeChild(this.dom.lastChild)
  }

  for (var k in this.items) {
    delete this.items[k].listItem
  }

  this.items = {}
}

module.exports = OverpassLayerList
