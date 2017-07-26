function OverpassLayerList(parentDom, layer) {
  this.layer = layer
  this.layer.layerList = this
  this.dom = document.createElement('ul')
  this.dom.className = 'overpass-layer-list'
  parentDom.appendChild(this.dom)
  this.items = {}
}

OverpassLayerList.prototype.addObject = function (ob) {
  var div = document.createElement('li')

  this.items[ob.id] = div

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
  if (ob.data.marker && ob.data.marker.iconUrl) {
    var a = document.createElement('img')
    a.className = 'marker'
    a.src = ob.data.marker.iconUrl
    p.appendChild(a)
  }

  // ICON
  var a = document.createElement('div')
  a.className = 'icon'
  a.innerHTML = ob.data.markerSign
  p.appendChild(a)

  // TITLE
  var a = document.createElement('a')
  a.className = 'title'
  a.href = 'appUrl' in ob.data ? ob.data.appUrl : '#'
  a.onclick = function (ob) {

    ob.feature.openPopup()
    return false
  }.bind(this, ob)
  a.innerHTML = ob.data.title
  div.appendChild(a)

  // DESCRIPTION
  var a = document.createElement('div')
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
}

OverpassLayerList.prototype.updateObject = function (ob) {
  if (!(ob.id in this.items)) {
    return
  }

  var div = this.items[ob.id]
  var p = div.firstChild
  while (p) {
    if (p.className === 'markerParent') {
      var a = p.firstChild
      while (a) {
        // MARKER
        if (a.className === 'marker') {
          if (ob.data.marker.iconUrl) {
            a.src = ob.data.marker.iconUrl
          } else {
            a.src = null
          }
        }

        // ICON
        if (a.className === 'icon') {
          a.innerHTML = ob.data.markerSign
        }

        a = a.nextSibling
      }
    }

    // TITLE
    if (p.className === 'title') {
      p.innerHTML = ob.data.title
    }

    p = p.nextSibling
  }
}

OverpassLayerList.prototype.delObject = function (ob) {
  var div = this.items[ob.id]

  this.dom.removeChild(div)
  delete this.items[ob.id]
}

OverpassLayerList.prototype.remove = function () {
  while (this.dom.firstChild) {
    this.dom.removeChild(this.dom.lastChild)
  }

  this.items = {}
}

module.exports = OverpassLayerList
