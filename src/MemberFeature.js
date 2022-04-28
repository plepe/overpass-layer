const SublayerFeature = require('./SublayerFeature')

class MemberFeature extends SublayerFeature {
  twigData () {
    const ob = this.object
    const result = super.twigData()

    for (const k in this.sublayer.masterlayer.visibleFeatures) {
      const feature = this.sublayer.masterlayer.visibleFeatures[k]
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

module.exports = MemberFeature
