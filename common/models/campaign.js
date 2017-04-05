var statusConfig = require('../../config/subcampaignStatus')
var app = require('../../server/server')
var roleManager = require('../../public/roleManager')
var utility = require('../../public/utility')
var startStyleList = require('../../config/startStyle.json')
var mediaStyleList = require('../../config/mediaStyle.json')

module.exports = function (campaign) {

  campaign.validatesInclusionOf('startStyle', { in: startStyleList })
  campaign.validatesInclusionOf('mediaStyle', { in: mediaStyleList })

  campaign.beforeRemote('prototype.__create__subcampaigns', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    ctx.args.data.clientId = ctx.args.options.accessToken.userId
    ctx.args.data.status = statusConfig.pending
    next()
  })

  campaign.beforeRemote('prototype.__updateById__subcampaigns', function (ctx, modelInstance, next) {
    roleManager.getRolesById(app, ctx.args.options.accessToken.userId, function (err, result) {
      if (err)
        return next(err)
      if (result.lenght == 0) {
        var whiteList = ['minBudget', 'name', 'style', 'plan', 'price']
        if (utility.inputChecker(ctx.args.data, whiteList)) {
          if (ctx.args.data.minBudget) {
            campaign.findById(ctx.req.params.id, function (err, result) {
              if (err)
                throw err
              var subBudget = 0
              for (var i = 0; i < result.subcampaignList.length; i++)
                subBudget += result.subcampaignList[i].minBudget
              if (ctx.args.data.minBudget + subBudget > result.budget)
                next(new Error('Error in Budget (Campaign)'))
              next()
            })
          }
        } else
          next(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()))
        next()
      }
    })
  })

  campaign.afterRemote('prototype.__create__subcampaigns', function (ctx, modelInstance, next) {
    var campaignId = ctx.req.params.id
    campaign.findById(campaignId, function (err, result) {
      if (err)
        throw err
      result.updateAttribute('status', statusConfig.pending, function (err, response) {
        if (err)
          throw err
        next()
      })
    })
  })

  campaign.afterRemote('prototype.__updateById__subcampaigns', function (ctx, modelInstance, next) {
    campaign.findById(ctx.req.params.id, function (err, result) {
      if (err)
        throw err
      for (var i = 0; i < result.subcampaignList.length; i++) {
        if (result.subcampaignList[i].status === statusConfig.pending)
          result.status = status.pending
      }
      for (var i = 0; i < result.subcampaignList.length; i++) {
        if (result.subcampaignList[i].status === statusConfig.suspend)
          result.status = status.suspend
      }
        next()
    })
  })


}
