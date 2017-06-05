var statusConfig = require('../../config/status')
var app = require('../../server/server')
var roleManager = require('../../public/roleManager')
var utility = require('../../public/utility')
var startStyleList = require('../../config/startStyle.json')
var mediaStyleList = require('../../config/mediaStyle.json')
var categoryList = require('../../config/category.json')
var countryList = require('../../config/country.json')
var userLabelList = require('../../config/userLabel.json')
var priorityList = require('../../config/priority.json')
var languageList = require('../../config/language.json')
var osList = require('../../config/operatingSystem.json')
var connectionList = require('../../config/connection.json')
var deviceList = require('../../config/device.json')

var rankingHelper = require('../helpers/rankingHelper')

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
          return next(err)
        if (ctx.args.data.minBudget == 0)
          return next(new Error('Error in Budget (Zero)'))

        var subcampaign = app.models.subcampaign
        subcampaign.find({
          where: {
            'campaignId': ctx.req.params.id
          }
        }, function (err, subcampaignList) {
          if (err)
            return next(err)
          var subBudget = 0
          for (var i = 0; i < subcampaignList.length; i++)
            subBudget += subcampaignList[i].minBudget
          if (ctx.args.data.minBudget + subBudget > result.budget)
            return next(new Error('Error in Budget (Subcampaign)'))
          ctx.args.data.clientId = ctx.args.options.accessToken.userId
          ctx.args.data.campaignId = ctx.req.params.id
          ctx.args.data.status = statusConfig.created
          ctx.args.data.weight = 0
          var settingToCreate = {
            priority: "Average",
            category: categoryList,
            country: countryList,
            language: languageList,
            device: deviceList,
            os: osList,
            userLabel: userLabelList,
            connection: connectionList,
            clientId: ctx.args.options.accessToken.userId
          }
          ctx.args.data.settingModel = settingToCreate
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
                return next(err)
              if (ctx.args.data.minBudget == 0)
                return next(new Error('Error in Budget (Zero)'))

              var subcampaign = app.models.subcampaign
              subcampaign.find({
                where: {
                  'campaignId': ctx.req.params.id
                }
              }, function (err, subcampaignList) {
                if (err)
                  return next(err)
                var subBudget = 0
                for (var i = 0; i < subcampaignList.length; i++) {
                  if (subcampaignList[i].id == ctx.req.params.fk)
                    continue
                  subBudget += subcampaignList[i].minBudget
                }
                if (ctx.args.data.minBudget + subBudget > result.budget)
                  return next(new Error('Error in Budget (Campaign)'))
                return next()
              })
            })
          } else
            return next()
        } else
          return next(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()))
      } else
        return next()
    })
  })

  campaign.afterRemote('prototype.__create__subcampaigns', function (ctx, modelInstance, next) {
    campaign.findById(ctx.ctorArgs.id, function (err, result) {
      if (err)
        return next(err)
      result.updateAttribute('status', statusConfig.pending, function (err, response) {
        if (err)
          return next(err)
        return next()
      })
    })
  })

  campaign.afterRemote('prototype.__updateById__subcampaigns', function (ctx, modelInstance, next) {
    campaign.findById(ctx.ctorArgs.id, function (err, result) {
      if (err)
        return next(err)

      var subcampaign = app.models.subcampaign
      subcampaign.find({
        where: {
          'campaignId': ctx.ctorArgs.id
        }
      }, function (err, subcampaignList) {
        if (err)
          return next(err)
        var approvedCounter = 0
        var status = result.status
        for (var i = 0; i < subcampaignList.length; i++) {
          if (subcampaignList[i].status === statusConfig.pending)
            status = statusConfig.pending
          if (subcampaignList[i].status === statusConfig.approved)
            approvedCounter++
          if (subcampaignList[i].status === statusConfig.suspend) {
            status = statusConfig.suspend
            break
          }
        }
        if (result.status !== statusConfig.started && approvedCounter == subcampaignList.length)
          status = statusConfig.approved
        result.updateAttribute('status', status, function (err, response) {
          if (err)
            return next(err)
          if (result.status === statusConfig.started || result.status === status.approved) {
            rankingHelper.setRankingAndWeight(result, function(err, result) {
              if (err)
                console.error(err)
              console.log(result)
            })
            return next()
          }
          else 
            return next()
        })
      })
    })
  })

  campaign.afterRemote('prototype.__destroyById__subcampaigns', function (ctx, modelInstance, next) {
    var container = '' + ctx.ctorArgs.id
    var file = '' + ctx.args.fk
    app.models.container.removeFile(container, file, function (err) {
      if (err)
        return next(err)
      rankingHelper.recalculateRankingAndWeight(function(err, result) {
        if (err)
          console.error(err)
        console.log(result)
      })
      return next()
    })
  })

  campaign.startManual = function (ctx, campaignHashId, callback) {
    if (!ctx.args.options.accessToken)
      return next()
    campaign.findById(campaignHashId, function (err, result) {
      if (err)
        return callback(err)
      if (result.beginningTime >= utility.getUnixTimeStamp() && result.endingTime <= utility.getUnixTimeStamp() && result.status == statusConfig.approved) {
        result.updateAttribute('status', statusConfig.started, function (err, obj) {
          if (err)
            return callback(err)
          return callback('Started')
        })
      }
      else {
        return callback(new Error('Can not be started'))
      }
    })
  }

  campaign.remoteMethod('startManual', {
    description: 'start manually a campaign',
    accepts: [{
        arg: 'ctx',
        type: 'object',
        http: {
          source: 'context'
        }
      },
      {
        arg: 'campaignHashId',
        type: 'string',
        required: true,
        http: {
          source: 'query'
        }
      }
    ],
    returns: {
      arg: 'startResponse',
      type: 'string'
    },
    http: {
      verb: 'GET'
    }
  })

}
