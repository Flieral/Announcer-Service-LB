var categoryList = require('../../config/category.json')
var countryList = require('../../config/country.json')
var userLabelList = require('../../config/userLabel.json')
var priorityList = require('../../config/priority.json')
var languageList = require('../../config/language.json')
var osList = require('../../config/operatingSystem.json')
var connectionList = require('../../config/connection.json')
var deviceList = require('../../config/device.json')

var utility = require('../../public/utility.js')

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
      if (!utility.JSONIterator(data.connection, deviceList))
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
}
