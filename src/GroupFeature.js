const SublayerFeature = require('./SublayerFeature')

class GroupFeature extends SublayerFeature {
  twigData () {
    const result = super.twigData()
    console.log('twigdata called', result)

    return result
  }

  show () {
    console.log(this.id, 'show called')
  }

  hide () {
    console.log(this.id, 'hide called')
  }
}

module.exports = GroupFeature
