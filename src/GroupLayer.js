const Sublayer = require('./Sublayer')

class GroupLayer extends Sublayer {
  add (group, feature) {
    console.log('add', group, feature)
  }

  remove (group, feature) {
    console.log('remove', group, feature)
  }
}

module.exports = GroupLayer
