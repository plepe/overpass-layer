const Sublayer = require('./Sublayer')

class Memberlayer extends Sublayer {
  constructor (master, options) {
    super(master, options)

    this.masterlayer = this.master.mainlayer

    this.masterlayer.on('add', this.featureOnMainModified.bind(this))
    this.masterlayer.on('remove', this.featureOnMainModified.bind(this))
    this.masterlayer.on('update', this.featureOnMainModified.bind(this))
    this.on('add', this.featureMemberModified.bind(this))
    this.on('remove', this.featureMemberModified.bind(this))
  }

  featureMemberModified (feature, data) {
    feature.memberOf.forEach(master => {
      this.masterlayer.scheduleReprocess(master.id)
    })
  }

  featureOnMainModified (feature) {
    if (!feature.members) {
      return
    }

    feature.members.forEach(member => {
      if (member.id in this.visibleFeatures) {
        this.scheduleReprocess(member.id)
      }
    })
  }

  twigData (ob, data) {
    const result = super.twigData(ob, data)

    for (var k in this.masterlayer.visibleFeatures) {
      const feature = this.masterlayer.visibleFeatures[k]
      if (feature.object.members) {
        feature.object.members.forEach((member, sequence) => {
          if (member.id === ob.id) {
            if (!('masters' in result)) {
              result.masters = []
            }

            result.masters.push({
              id: feature.id,
              type: feature.object.type,
              osm_id: feature.object.osm_id,
              tags: feature.object.tags,
              meta: feature.object.meta,
              role: member.role,
              dir: member.dir,
              connectedPrev: member.connectedPrev,
              connectedNext: member.connectedNext,
              flags: feature.flags,
              sequence
            })
          }
        })
      }
    }

    return result
  }
}

module.exports = Memberlayer
