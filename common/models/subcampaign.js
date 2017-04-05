module.exports = function (subcampaign) {
  
  var subPlan = require('../../config/subPlan')
  var subStyle = require('../../config/planStyle')

  subcampaign.validatesInclusionOf('style', {in: subStyle})
  subcampaign.validatesInclusionOf('plan', {in: subPlan})

  subcampaign.beforeRemote('prototype.__create__setting', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    ctx.args.data.clientId = ctx.args.options.accessToken.userId
    return next()
  })

  subcampaign.beforeRemote('prototype.__updateById__setting', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    ctx.args.data.clientId = ctx.args.options.accessToken.userId
    return next()
  })
}
