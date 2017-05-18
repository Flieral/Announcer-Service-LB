var cron = require('cron')
var app = require('../server')
var statusConfig = require('../../config/status.json')
var utility = require('../../public/utility')

var startCampaign = cron.job("0 */1 * * * *", function () {
  campaign = app.models.campaign
  campaign.find({
    where: {
      'status': statusConfig.approved,
      'startStyle': "Automatic"
    }
  }, function (err, campaignList) {
    if (err)
      throw err
    for (var i = 0; i < campaignList.length; i++) {
      if (campaignList[i].beginningTime <= utility.getUnixTimeStamp() && campaignList[i].endingTime >= utility.getUnixTimeStamp()) {
        campaignList[i].updateAttribute('status', status.started, function (err, campaignInst) {
					if (err)
						throw err
        })
      }
    }
  })
})

var finishCampaign = cron.job("0 */1 * * * *", function () {
  campaign = app.models.campaign
  campaign.find({
    where: {
      'status': statusConfig.started
    }
  }, function (err, campaignList) {
    if (err)
      throw err
    for (var i = 0; i < campaignList.length; i++) {
      if (campaignList[i].endingTime < utility.getUnixTimeStamp()) {
        campaignList[i].updateAttribute('status', status.finished, function (err, campaignInst) {
					if (err)
						throw err
        })
      }
    }
  })
})

startCampaign.start()
finishCampaign.start()
