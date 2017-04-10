var categoryList = require('../../config/category.json')
var countryList = require('../../config/country.json')
var userLabelList = require('../../config/userLabel.json')
var priorityList = require('../../config/priority.json')
var languageList = require('../../config/language.json')
var osList = require('../../config/operatingSystem.json')
var connectionList = require('../../config/connection.json')
var deviceList = require('../../config/device.json')

var utility = require('../../public/utility.js')

module.exports = function (setting) {

  setting.validatesInclusionOf('priority', { in: priorityList })

  setting.beforeRemote('create', function (ctx, modelInstance, next) {
    if (!utility.JSONIterator(ctx.args.data.category, categoryList))
      next(new Error('category Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.userLabel, userLabelList))
      next(new Error('userLabel Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.country, countryList))
      next(new Error('country Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.language, languageList))
      next(new Error('language Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.os, osList))
      next(new Error('os Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.connection, deviceList))
      next(new Error('connection Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.device, deviceList))
      next(new Error('device Validation Error'))
    next()
  })

  setting.beforeRemote('update', function (ctx, modelInstance, next) {
    if (!utility.JSONIterator(ctx.args.data.category, categoryList))
      next(new Error('category Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.userLabel, userLabelList))
      next(new Error('userLabel Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.country, countryList))
      next(new Error('country Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.language, languageList))
      next(new Error('language Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.os, osList))
      next(new Error('os Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.connection, deviceList))
      next(new Error('connection Validation Error'))
    if (!utility.JSONIterator(ctx.args.data.device, deviceList))
      next(new Error('device Validation Error'))
    next()
  })  

}