const Sublayer = require('./Sublayer')
const GroupObject = require('./GroupObject')

class GroupLayer extends Sublayer {
  constructor (master, options) {
    super(master, options)
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
    feature.geometryChanged = true

    if (isNew) {
      feature.processObject()
      feature.show()

      if (this.master.onAppear) {
        this.master.onAppear(feature)
      }

      this.master.emit('add', feature.object, feature)
      this.emit('add', feature.object, feature)
    } else {
      this.scheduleReprocess(feature.id)

      this.master.emit('update', feature.object, feature)
      this.emit('update', feature.object, feature)
    }
  }

  remove (group, member) {
    if (!(group in this.visibleFeatures)) {
      return
    }

    const feature = this.visibleFeatures[group]

    feature.object.remove(member)
    feature.geometryChanged = true

    if (Object.keys(feature.object.list).length) {
      this.scheduleReprocess(feature.id)

      this.master.emit('update', feature.object, feature)
      this.emit('update', feature.object, feature)
    } else {
      this.hide()
    }
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
