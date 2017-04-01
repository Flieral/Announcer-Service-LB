var categoryList = require('../../config/category.json')
var countryList = require('../../config/country.json')
var userLabelList = require('../../config/userLabel.json')

module.exports = function (setting) {

  // Should Add Some Validation Methods

  setting.validatesInclusionOf('category', { in: categoryList })
  setting.validatesInclusionOf('country', { in: countryList })
  setting.validatesInclusionOf('userLabel', { in: userLabelList })
}