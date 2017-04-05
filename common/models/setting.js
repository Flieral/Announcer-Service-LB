var categoryList = require('../../config/category.json')
var countryList = require('../../config/country.json')
var userLabelList = require('../../config/userLabel.json')
var priorityList = require('../../config/priority.json')
var languageList = require('../../config/language.json')
var osList = require('../../config/operatingSystem.json')
var connectionList = require('../../config/connection.json')
var deviceList = require('../../config/device.json')

module.exports = function (setting) {

  setting.validatesInclusionOf('category', { in: categoryList })
  setting.validatesInclusionOf('country', { in: countryList })
  setting.validatesInclusionOf('userLabel', { in: userLabelList })
  setting.validatesInclusionOf('priority', { in: priorityList })
  setting.validatesInclusionOf('language', { in: languageList })
  setting.validatesInclusionOf('os', { in: osList })
  setting.validatesInclusionOf('connection', { in: connectionList })
  setting.validatesInclusionOf('device', { in: deviceList })
}