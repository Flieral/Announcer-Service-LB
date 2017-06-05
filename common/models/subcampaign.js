var categoryList = require('../../config/category.json')
var countryList = require('../../config/country.json')
var userLabelList = require('../../config/userLabel.json')
var priorityList = require('../../config/priority.json')
var languageList = require('../../config/language.json')
var osList = require('../../config/operatingSystem.json')
var connectionList = require('../../config/connection.json')
var deviceList = require('../../config/device.json')
var statusConfig = require('../../config/status')

var utility = require('../../public/utility.js')

var app = require('../../server/server')

module.exports = function (subcampaign) {
  
  var subPlan = require('../../config/subPlan')
  var subStyle = require('../../config/subStyle')

  subcampaign.validatesInclusionOf('style', {in: subStyle})
  subcampaign.validatesInclusionOf('plan', {in: subPlan})

  var settingValidator = function (data, callback) {
    var whiteList = ['priority', 'category', 'country', 'language', 'device', 'os', 'dayParting', 'preferences', 'userLabel', 'connection']
    if (utility.inputChecker(data, whiteList)) {
      if (!utility.JSONIterator(data.category, categoryList))
        return callback(new Error('category Validation Error'), null)
      if (!utility.JSONIterator(data.userLabel, userLabelList))
        return callback(new Error('userLabel Validation Error'), null)
      if (!utility.JSONIterator(data.country, countryList))
        return callback(new Error('country Validation Error'), null)
      if (!utility.JSONIterator(data.language, languageList))
        return callback(new Error('language Validation Error'), null)
      if (!utility.JSONIterator(data.os, osList))
        return callback(new Error('os Validation Error'), null)
      if (!utility.JSONIterator(data.connection, connectionList))
        return callback(new Error('connection Validation Error'), null)
      if (!utility.JSONIterator(data.device, deviceList))
        return callback(new Error('device Validation Error'), null)
      return callback(null, 'validated successfully')
    }
    else
      return callback(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()), null)
  }

  subcampaign.beforeRemote('prototype.__create__setting', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    settingValidator(ctx.args.data, function (err, result) {
      if (err)
        return next(err)
      ctx.args.data.clientId = ctx.args.options.accessToken.userId
      return next()
    })
  })

  subcampaign.beforeRemote('prototype.__update__setting', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    settingValidator(ctx.args.data, function (err, result) {
      if (err)
        return next(err)
      return next()
    })
  })

  subcampaign.reduceChain = function (subcampaignHashID, campaignHashID, accountHashID, reduceValue, cb) {
    var campaign = app.models.campaign
    var announcerAccount = app.models.announcerAccount
    var reduction = 0
    subcampaign.findById(subcampaignHashID, function (err, subcampaignInst) {
      if (err)
        return cb(err, null)
      if (subcampaignInst.minBudget < reduceValue)
        reduceValue = subcampaignInst.minBudget
      reduction = subcampaignInst.minBudget - reduceValue
      var subcampaigndata = {}
      subcampaigndata.minBudget = reduction
      if (reduction == 0)
        subcampaigndata.status = statusConfig.finished
      subcampaignInst.updateAttributes(subcampaigndata, function (err, response) {
        if (err)
          return cb(err)
        var filter = {
          include: 'subcampaigns'
        }
        campaign.findById(campaignHashID, filter, function (err, campaignInst) {
          if (err)
            return cb(err)
          if (campaignInst.budget < reduceValue)
            reduceValue = campaignInst.budget
          reduction = campaignInst.budget - reduceValue
          var campaigndata = {}
          campaigndata.budget = reduction
          var allSubcampaignsFinished = false
          var counter = 0
          for (var i = 0; i < campaignInst.toJSON().subcampaigns.length; i++)
            if (campaignInst.toJSON().subcampaigns[i].status === statusConfig.finished)
              counter++
          if (counter == campaignInst.toJSON().subcampaigns.length)
            allSubcampaignsFinished = true
          if (reduction == 0 || allSubcampaignsFinished)
            campaigndata.status = statusConfig.finished
          campaignInst.updateAttributes(campaigndata, function (err, response) {
            if (err)
              return cb(err)
            announcerAccount.findById(accountHashID, function (err, accountInst) {
              if (err)
                return cb(err)
              if (accountInst.budget < reduceValue)
                reduceValue = accountInst.budget
              reduction = accountInst.budget - reduceValue
              accountInst.updateAttribute('budget', reduction, function (err, response) {
                if (err)
                  return cb(err)
                return cb('successful reduction chain')
              })
            })
          })
        })
      })
    })
  }

  subcampaign.remoteMethod('reduceChain', {
    accepts: [{
      arg: 'subcampaignHashID',
      type: 'string',
      required: true,
      http: {
        source: 'query'
      }
    }, {
      arg: 'campaignHashID',
      type: 'string',
      required: true,
      http: {
        source: 'query'
      }
    }, {
      arg: 'accountHashID',
      type: 'string',
      required: true,
      http: {
        source: 'query'
      }
    }, {
      arg: 'reduceValue',
      type: 'number',
      required: true,
      http: {
        source: 'query'
      }
    }],
    description: 'sub reduceValue from particular chain of subcampaign and its campaign and its own account',
    http: {
      path: '/reduceChain',
      verb: 'POST',
      status: 200,
      errorStatus: 400
    },
    returns: {
      arg: 'response',
      type: 'object'
    }
  })

}
