/* global overpassFrontend:false, L */
require('./overpass-layer.css')

var BoundingBox = require('boundingbox')
var twig = require('twig')
var OverpassFrontend = require('overpass-frontend')
var escapeHtml = require('html-escape')
var isTrue = require('./isTrue')
var Sublayer = require('./Sublayer')

function OverpassLayer (options) {
  var template

  if (!options) {
    options = {}
  }

  this.options = options

  this.overpassFrontend = 'overpassFrontend' in this.options ? this.options.overpassFrontend : overpassFrontend
  this.options.minZoom = 'minZoom' in this.options ? this.options.minZoom : 16
  this.options.maxZoom = 'maxZoom' in this.options ? this.options.maxZoom : null
  this.options.feature = 'feature' in this.options ? this.options.feature : {}
  this.options.feature.style = 'style' in this.options.feature ? this.options.feature.style : {}
  this.options.feature.title = 'title' in this.options.feature ? this.options.feature.title : function (ob) { return escapeHtml(ob.tags.name || ob.tags.operator || ob.tags.ref || ob.id) }
  this.options.feature.body = 'body' in this.options.feature ? this.options.feature.body : ''
  this.options.feature.markerSymbol = 'markerSymbol' in this.options.feature ? this.options.feature.markerSymbol : '<img anchorX="13" anchorY="42" width="25" height="42" signAnchorX="0" signAnchorY="-30" src="img/map_pointer.png">'
  this.options.feature.markerSign = 'markerSign' in this.options.feature ? this.options.feature.markerSign : null
  this.options.queryOptions = 'queryOptions' in this.options ? this.options.queryOptions : {}
  if (!('properties' in this.options.queryOptions)) {
    this.options.queryOptions.properties = OverpassFrontend.ALL
  }
  this.options.styleNoBindPopup = this.options.styleNoBindPopup || []
  this.options.stylesNoAutoShow = this.options.stylesNoAutoShow || []

  for (var k in this.options.feature) {
    if (typeof this.options.feature[k] === 'string' && this.options.feature[k].search('{') !== -1) {
      try {
        template = twig.twig({ data: this.options.feature[k], autoescape: true })
      } catch (err) {
        console.log('Error compiling twig template ' + this.id + '/' + k + ':', err)
        break
      }

      this.options.feature[k] = function (template, k, ob) {
        try {
          return template.render(ob)
        } catch (err) {
          console.log('Error rendering twig template ' + this.id + '/' + k + ': ', err)
        }

        return null
      }.bind(this, template, k)
    } else if (typeof this.options.feature[k] === 'object' && (['style'].indexOf(k) !== -1 || k.match(/^style:/))) {
      var templates = {}
      for (var k1 in this.options.feature[k]) {
        if (typeof this.options.feature[k][k1] === 'string' && this.options.feature[k][k1].search('{') !== -1) {
          templates[k1] = twig.twig({ data: this.options.feature[k][k1], autoescape: true })
        } else {
          templates[k1] = this.options.feature[k][k1]
        }
      }

      this.options.feature[k] = function (templates, ob) {
        var ret = {}
        for (var k1 in templates) {
          if (typeof templates[k1] === 'object' && templates[k1] !== null && 'render' in templates[k1]) {
            ret[k1] = templates[k1].render(ob)
          } else {
            ret[k1] = templates[k1]
          }
        }
        return ret
      }.bind(this, templates)
    }
  }

  this.currentRequest = null
  this.lastZoom = null
  this._scheduledReprocesses = {}

  this.mainlayer = new Sublayer(this, options)
}

OverpassLayer.prototype.addTo = function (map) {
  this.map = map
  this.map.on('moveend', this.check_update_map, this)
  this.mainlayer.addTo(map)
  this.check_update_map()
}

OverpassLayer.prototype.remove = function () {
  var k

  this.mainlayer.hideAll(true)

  this.abortRequest()

  this.map.off('moveend', this.check_update_map, this)
  this.map = null
}

OverpassLayer.prototype.abortRequest = function () {
  if (this.currentRequest) {
    if (this.onLoadEnd) {
      this.onLoadEnd({
        request: this.currentRequest,
        error: 'abort'
      })
    }

    this.currentRequest.abort()
    this.currentRequest = null
  }
}

OverpassLayer.prototype.check_update_map = function () {
  var bounds = new BoundingBox(this.map.getBounds())
  var k
  var ob

  if (this.map.getZoom() < this.options.minZoom ||
     (this.options.maxZoom !== null && this.map.getZoom() > this.options.maxZoom)) {
    this.mainlayer.hideAll()

    // abort remaining request
    this.abortRequest()

    return
  }

  this.mainlayer.hideNonVisible(bounds)

  // When zoom level changed, update visible objects
  if (this.lastZoom !== this.map.getZoom()) {
    this.mainlayer.zoomChange()
    this.lastZoom = this.map.getZoom()
  }

  // Abort current requests (in case they are long-lasting - we don't need them
  // anyway). Data which is being submitted will still be loaded to the cache.
  this.abortRequest()

  var query = this.options.query
  if (typeof query === 'object') {
    query = query[Object.keys(query).filter(function (x) { return x <= this.map.getZoom() }.bind(this)).reverse()[0]]
  }

  if (!query) {
    return
  }

  this.mainlayer.startAdding()

  this.currentRequest = this.overpassFrontend.BBoxQuery(query, bounds,
    this.options.queryOptions,
    function (err, ob) {
      if (err) {
        console.log('unexpected error', err)
      }

      this.mainlayer.add(ob)

    }.bind(this),
    function (err) {
      if (err === 'abort') {
        return
      }

      if (this.onLoadEnd) {
        this.onLoadEnd({
          request: this.currentRequest,
          error: err
        })
      }

      this.mainlayer.finishAdding()

      this.currentRequest = null
    }.bind(this)
  )

  if (this.onLoadStart) {
    this.onLoadStart({
      request: this.currentRequest
    })
  }
}

OverpassLayer.prototype.recalc = function () {
  this.mainlayer.recalc()
}

OverpassLayer.prototype.scheduleReprocess = function (id) {
  this.mainlayer.scheduleReprocess(id)
}

OverpassLayer.prototype.updateAssets = function (div, objectData) {
  this.mainlayer.updateAssets(div, objectData)
}

OverpassLayer.prototype.get = function (id, callback) {
  var done = false

  this.overpassFrontend.get(id,
    {
      properties: OverpassFrontend.ALL
    },
    function (err, ob) {
      if (err === null) {
        callback(err, ob)
      }

      done = true
    }.bind(this),
    function (err) {
      if (!done) {
        callback(err, null)
      }
    }
  )
}

OverpassLayer.prototype.show = function (id, options, callback) {
  let instantHide = false // called hide before loading finished
  let sublayerData

  var result = {
    id: id,
    options: options,
    hide: function () {
      instantHide = true

      if (sublayerData) {
        sublayerData.hide()
      }

    }.bind(this)
  }

  this.get(id,
    function (err, ob) {
      if (err) {
        return callback(err, ob)
      }

      if (instantHide) {
        return callback(null, ob)
      }

      sublayerData = this.mainlayer.show(ob, options)

      callback(err, sublayerData.data)
    }.bind(this)
  )

  return result
}

OverpassLayer.prototype.hide = function (id) {
  this.mainlayer.hide(id)
}

// to enable extending twig
OverpassLayer.twig = twig

module.exports = OverpassLayer
