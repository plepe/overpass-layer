const Sublayer = require('./Sublayer')
const MemberFeature = require('./MemberFeature')

class Memberlayer extends Sublayer {
  constructor (master, options) {
    super(master, options)

    this.masterlayer = this.master.mainlayer
    this.featureClass = MemberFeature

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
}

module.exports = Memberlayer
