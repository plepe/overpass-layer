var twig = require('twig')

function init () {
  for (var k in this.options.memberFeature) {
    if (typeof this.options.memberFeature[k] === 'string' && this.options.memberFeature[k].search('{') !== -1) {
      try {
        template = twig.twig({ data: this.options.memberFeature[k], autoescape: true })
      } catch (err) {
        console.log('Error compiling twig template ' + this.id + '/' + k + ':', err)
        break
      }

      this.options.memberFeature[k] = function (template, k, ob) {
        try {
          return template.render(ob)
        } catch (err) {
          console.log('Error rendering twig template ' + this.id + '/' + k + ': ', err)
        }

        return null
      }.bind(this, template, k)
    } else if (typeof this.options.memberFeature[k] === 'object' && (['style'].indexOf(k) !== -1 || k.match(/^style:/))) {
      var templates = {}
      for (var k1 in this.options.memberFeature[k]) {
        if (typeof this.options.memberFeature[k][k1] === 'string' && featureOptions[k][k1].search('{') !== -1) {
          templates[k1] = twig.twig({ data: this.options.memberFeature[k][k1], autoescape: true })
        } else {
          templates[k1] = this.options.memberFeature[k][k1]
        }
      }

      this.options.memberFeature[k] = function (templates, ob) {
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

  this.shownMemberFeatures = {}
  this.visibleMemberFeatures = {}

  if (this.options.members) {
    this.options.queryOptions.properties = 15
    this.options.queryOptions.memberProperties = OverpassFrontend.ALL
    this.options.queryOptions.members = true
  }
}

function prepare (bounds) {
  var thisRequestMemberFeatures = {}

  this.options.queryOptions.memberBounds = bounds
  this.options.queryOptions.memberCallback = function (err, ob) {
    if (err) {
      console.log('unexpected error', err)
    }

    thisRequestMemberFeatures[ob.id] = true

    if (!(ob.id in this.visibleMemberFeatures)) {
      var data = {
        object: ob,
        isShown: false
      }

      if (ob.id in this.shownMemberFeatures) {
        data = this.shownMemberFeatures[ob.id]
      } else {
        this._processObject(data, this.options.memberFeature)

        this._show(data)
      }

      this.visibleMemberFeatures[ob.id] = data

//        if (this.layerList) {
//          this.layerList.addObject(data)
//        }
//        if (this.onAppear) {
//          this.onAppear(data)
//        }
    }
  }.bind(this)
}

module.exports = {
  init,
  prepare
}
