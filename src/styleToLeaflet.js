var styleLeafletBooleanValues = [ 'stroke', 'fill', 'textRepeat', 'textBelow', 'noClip' ]
var styleLeafletRenameValues = { 'width': 'weight' }

function styleToLeaflet (style) {
  var ret = JSON.parse(JSON.stringify(style))

  for (var i in styleLeafletBooleanValues) {
    var k = styleLeafletBooleanValues[i]

    if (k in style) {
      ret[k] = isTrue(style[k])
    }
  }

  for (var from in styleLeafletRenameValues) {
    if (from in ret) {
      var to = styleLeafletRenameValues[from]
      ret[to] = ret[from]
    }
  }

  return ret
}

module.exports = styleToLeaflet
