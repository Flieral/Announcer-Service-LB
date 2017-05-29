var cron = require('cron')
var app = require('../server')
var statusConfig = require('../../config/status.json')
var utility = require('../../public/utility')

var rankingHelper = require('../../common/helpers/rankingHelper')

var startCampaign = cron.job("0 */1 * * * *", function () {
  campaign = app.models.campaign
  campaign.find({
    where: {
      'status': statusConfig.approved,
      'startStyle': "Automatic"
    }
  }, function (err, campaignList) {
    if (err)
      console.error(err)
    for (var i = 0; i < campaignList.length; i++) {
      if (campaignList[i].beginningTime <= utility.getUnixTimeStamp() && campaignList[i].endingTime >= utility.getUnixTimeStamp()) {
        campaignList[i].updateAttribute('status', status.started, function (err, campaignInst) {
					if (err)
						console.error(err)
          rankingHelper.setRankingAndWeight(campaignList[i], function(err, result) {
            if (err)
              console.error(err)            
          })
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
      console.error(err)
    for (var i = 0; i < campaignList.length; i++) {
      if (campaignList[i].endingTime < utility.getUnixTimeStamp()) {
        campaignList[i].updateAttribute('status', status.finished, function (err, campaignInst) {
					if (err)
						console.error(err)
          rankingHelper.recalculateRankingAndWeight(function(err, result) {
            if (err)
              console.error(err)
          })
        })
      }
    }
  })
})

var recalculateRanking = cron.job("0 */1 * * * *", function () {
  rankingHelper.recalculateRankingAndWeight(function(err, result) {
    if (err)
      console.error(err)
  })
})

startCampaign.start()
finishCampaign.start()
recalculateRanking.start()