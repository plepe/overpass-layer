const Sublayer = require('./Sublayer')
const SublayerFeature = require('./SublayerFeature')

class Grouplayer extends Sublayer {
  constructor (master, options) {
    super(master, options)

    this.masterlayer = this.master.mainlayer

    this.masterlayer.on('add', this.featureOnMainModified.bind(this))
    this.masterlayer.on('remove', this.featureOnMainModified.bind(this))
    this.masterlayer.on('update', this.featureOnMainModified.bind(this))
    this.on('add', this.featureGroupModified.bind(this))
    this.on('remove', this.featureGroupModified.bind(this))
  }

  featureGroupModified (feature, data) {
    feature.memberOf.forEach(master => {
      this.masterlayer.scheduleReprocess(master.id)
    })
  }

  featureOnMainModified (ob, feature) {
    let id = '' + feature.data.groupId
    if (!id) {
      return
    }

    let groupFeature
    if (id in this.visibleFeatures) {
      groupFeature = this.visibleFeatures[id]
    } else {
      groupFeature = new SublayerFeature()
    }

    this.scheduleReprocess(id)

    console.log(id)
    return

    feature.members.forEach(member => {
      if (member.id in this.visibleFeatures) {
        this.scheduleReprocess(member.id)
      }
    })
  }

  twigData (ob, data) {
    let result = super.twigData(ob, data)

    for (var k in this.masterlayer.visibleFeatures) {
      let feature = this.masterlayer.visibleFeatures[k]
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

module.exports = Grouplayer
