module.exports = function compileTemplate (template, twig, options = {}) {
  if (typeof template === 'string' && template.search('{') !== -1) {
    let result

    try {
      result = twig.twig({ data: template, autoescape: options.autoescape })
    } catch (err) {
      console.log('Error compiling twig template', template, err)
      return template
    }

    return (ob) => {
      try {
        return result.render(ob)
      } catch (err) {
        console.log('Error rendering twig template', template, err)
      }

      return null
    }
  }

  return template
}
