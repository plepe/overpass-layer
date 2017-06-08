function OverpassLayerList(dom, layer) {
  layer.onAppear = this.addObject.bind(this)
  layer.onDisappear = this.delObject.bind(this)
  this.dom = dom
  this.items = {}
}

OverpassLayerList.prototype.addObject = function (ob, data) {
  var div = document.createElement('div')

  this.items[ob.id] = div

  div.innerHTML = ob.tags.name

  this.dom.appendChild(div)
}

OverpassLayerList.prototype.delObject = function (ob, data) {
  var div = this.items[ob.id]

  this.dom.removeChild(div)
  delete this.items[ob.id]
}

module.exports = OverpassLayerList
