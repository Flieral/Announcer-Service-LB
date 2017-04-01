var accountType = require('../../config/accountType.json')

module.exports = function (account) {
  account.validatesInclusionOf('type', {in: accountType})
}