const Sublayer = require('./Sublayer')
const GroupFeature = require('./GroupFeature')
const GroupObject = require('./GroupObject')

class GroupLayer extends Sublayer {
  constructor (master, options) {
    super(master, options)

    this.featureClass = GroupFeature
  }

  add (group, member) {
    let feature
    let isNew = false

    if (group in this.visibleFeatures) {
      feature = this.visibleFeatures[group]
    } else {
      const groupObject = new GroupObject(group)
      feature = new this.featureClass(groupObject, this)
      this.visibleFeatures[group] = feature
      isNew = true
    }

    feature.object.add(member)
    feature.processObject()

    if (isNew) {
      feature.show()

      if (this.master.onAppear) {
        this.master.onAppear(feature)
      }

      this.master.emit('add', ob, data)
      this.emit('add', ob, data)
    }
  }

  remove (group, feature) {
    console.log('remove', group, feature.id)
  }

  recalc () {
    console.log('recalc called')
    super.recalc()
  }

  finishAdding () {
    console.log('visible', Object.keys(this.visibleFeatures))
  }
}

module.exports = GroupLayer
