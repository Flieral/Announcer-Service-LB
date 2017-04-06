var accountType = require('../../config/accountType.json')

module.exports = function (announcerAccount) {
  var accountTypeList = []
  for (var key in accountType) 
    accountTypeList.push(accountType[key])
  
  announcerAccount.validatesInclusionOf('type', {in: accountTypeList})
}