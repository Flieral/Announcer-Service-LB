var statusConfig = require('../../config/status')
var app = require('../../server/server')
var roleManager = require('../../public/roleManager')
var utility = require('../../public/utility')
var startStyleList = require('../../config/startStyle.json')
var mediaStyleList = require('../../config/mediaStyle.json')

module.exports = function (campaign) {

  campaign.validatesInclusionOf('startStyle', { in: startStyleList
  })
  campaign.validatesInclusionOf('mediaStyle', { in: mediaStyleList
  })

  campaign.beforeRemote('prototype.__create__subcampaigns', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    var whiteList = ['minBudget', 'name', 'style', 'plan', 'price']
    if (utility.inputChecker(ctx.args.data, whiteList)) {
      campaign.findById(ctx.req.params.id, function (err, result) {
        if (err)
          throw err
        if (ctx.args.data.minBudget == 0)
          return next(new Error('Error in Budget (Zero)'))  
        
        var subcampaign = app.models.subcampaign
        subcampaign.find({ where: { 'campaignId': ctx.req.params.fk } }, function (err, subcampaignList) {
          if (err)
            throw err
          var subBudget = 0
          for (var i = 0; i < subcampaignList.length; i++)
            subBudget += subcampaignList[i].minBudget
          if (ctx.args.data.minBudget + subBudget > result.budget)
            return next(new Error('Error in Budget (Subcampaign)'))
          ctx.args.data.clientId = ctx.args.options.accessToken.userId
          ctx.args.data.campaignId = ctx.args.options.accessToken.userId
          ctx.args.data.status = statusConfig.pending
          return next()
        })
      })
    } else
        return next(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()))
  })

  campaign.beforeRemote('prototype.__updateById__subcampaigns', function (ctx, modelInstance, next) {
    roleManager.getRolesById(app, ctx.args.options.accessToken.userId, function (err, response) {
      if (err)
        return next(err)
      if (response.roles.length == 0) {
        var whiteList = ['minBudget', 'name', 'style', 'plan', 'price']
        if (utility.inputChecker(ctx.args.data, whiteList)) {
          if (ctx.args.data.minBudget) {
            campaign.findById(ctx.req.params.id, function (err, result) {
              if (err)
                throw err
              if (ctx.args.data.minBudget == 0)
                return next(new Error('Error in Budget (Zero)'))

              var subcampaign = app.models.subcampaign
              subcampaign.find({ where: { 'campaignId': ctx.req.params.fk } }, function (err, subcampaignList) {
                if (err)
                  throw err
                var subBudget = 0
                for (var i = 0; i < subcampaignList.length; i++){
                  if (subcampaignList[i].id == ctx.req.params.fk)
                    continue
                  subBudget += subcampaignList[i].minBudget
                }
                if (ctx.args.data.minBudget + subBudget > result.budget)
                  return next(new Error('Error in Budget (Campaign)'))
                return next()
              })
            })
          }
          else 
            return next()
        } else
          return next(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()))
      }
      else 
        return next()
    })
  })

  campaign.afterRemote('prototype.__create__subcampaigns', function (ctx, modelInstance, next) {
    campaign.findById(ctx.ctorArgs.id, function (err, result) {
      if (err)
        throw err
      result.updateAttribute('status', statusConfig.pending, function (err, response) {
        if (err)
          throw err
        return next()
      })
    })
  })

  campaign.afterRemote('prototype.__updateById__subcampaigns', function (ctx, modelInstance, next) {
    campaign.findById(ctx.ctorArgs.id, function (err, result) {
      if (err)
        throw err
      
      var subcampaign = app.models.subcampaign
      subcampaign.find({ where: { 'campaignId': ctx.ctorArgs.id } }, function (err, subcampaignList) {
        if (err)
          throw err
        var status = statusConfig.approved
        for (var i = 0; i < subcampaignList.length; i++) {
          if (subcampaignList[i].status === statusConfig.pending)
            status = statusConfig.pending
          if (subcampaignList[i].status === statusConfig.suspend) {
            status = statusConfig.suspend
            break
          }
        }
        result.updateAttribute('status', status, function (err, response) {
          if (err)
            throw err
          return next()
        })        
      })
    })
  })

}
