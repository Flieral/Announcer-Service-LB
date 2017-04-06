var accountType = require('../../config/accountType.json')

module.exports = function (announcerAccount) {
  announcerAccount.validatesInclusionOf('type', {in: accountType})
}