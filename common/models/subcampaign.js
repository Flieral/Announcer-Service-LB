module.exports = function (campaign) {
  
  // Should Add Some Validation Methods

  campaign.beforeRemote('prototype.__create__setting', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    ctx.args.data.clientId = ctx.args.options.accessToken.userId
    next()
  })

  campaign.beforeRemote('prototype.__updateById__setting', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    ctx.args.data.clientId = ctx.args.options.accessToken.userId
    next()
  })
}
