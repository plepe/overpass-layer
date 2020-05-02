function compileFeature (feature, twig) {
  for (var k in feature) {
    if (typeof feature[k] === 'string' && feature[k].search('{') !== -1) {
      let template

      try {
        template = twig.twig({ data: feature[k], autoescape: true })
      } catch (err) {
        console.log('Error compiling twig template ' + this.id + '/' + k + ':', err)
        break
      }

      feature[k] = function (template, k, ob) {
        try {
          return template.render(ob)
        } catch (err) {
          console.log('Error rendering twig template ' + this.id + '/' + k + ': ', err)
        }

        return null
      }.bind(this, template, k)
    } else if (typeof feature[k] === 'object' && (['style'].indexOf(k) !== -1 || k.match(/^style:/))) {
      var templates = {}
      for (var k1 in feature[k]) {
        if (typeof feature[k][k1] === 'string' && feature[k][k1].search('{') !== -1) {
          try {
            templates[k1] = twig.twig({ data: feature[k][k1], autoescape: true, rethrow: true })
          } catch (e) {
            console.error("Can't compile template:\n" + feature[k][k1] + "\n\n", e.message)
          }
        } else {
          templates[k1] = feature[k][k1]
        }
      }

      feature[k] = function (templates, ob) {
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

  return feature
}

module.exports = compileFeature
