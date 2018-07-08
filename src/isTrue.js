function isTrue (value) {
  if (typeof value === null) {
    return false
  }

  if (typeof value === 'undefined') {
    return false
  }

  if (typeof value === 'boolean') {
    return value
  }

  if ((typeof value === 'string') ||
      (typeof value === 'object' && 'twig_markup' in value)) {
    if (value.trim() === 'false') {
      return false
    }
    if (value.trim() === 'true') {
      return true
    }
  }

  if (value === 0 || value.toString() === '0' || value.toString() === '') {
    return false
  }

  return true
}

window.isTrue = isTrue
module.exports = isTrue
