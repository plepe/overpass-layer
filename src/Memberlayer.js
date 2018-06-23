const Sublayer = require('./Sublayer')

class Memberlayer extends Sublayer {
  twigData (ob) {
    let result = super.twigData(ob)

    for (var k in this.master.mainlayer.visibleFeatures) {
      let feature = this.master.mainlayer.visibleFeatures[k]
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
