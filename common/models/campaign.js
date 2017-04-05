var startStyleList = require('../../config/startStyle.json')
var mediaStyleList = require('../../config/mediaStyle.json')

module.exports = function (campaign) {

  campaign.validatesInclusionOf('startStyle', { in: startStyleList })
  campaign.validatesInclusionOf('mediaStyle', { in: mediaStyleList })

  campaign.beforeRemote('prototype.__create__subcampaigns', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    ctx.args.data.clientId = ctx.args.options.accessToken.userId
    next()
  })

  campaign.beforeRemote('prototype.__updateById__subcampaigns', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    ctx.args.data.clientId = ctx.args.options.accessToken.userId
    next()
  })
}
