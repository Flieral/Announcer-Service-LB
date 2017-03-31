var methodDisabler = require('../../public/methodDisabler.js')
var accountType = require('../../config/accountType.json')
var relationMethodPrefixes = [
  'createChangeStream',
  'upsertWithWhere',
  'patchOrCreate',
  'exists',
  'prototype.patchAttributes'
]


module.exports = function (account) {
  account.validatesInclusionOf('type', {in: accountType})
}