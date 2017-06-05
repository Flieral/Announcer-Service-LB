var applyFilter = require('loopback-filters')

var statusConfig = require('../../config/status')
var app = require('../../server/server')

var mediaStyleCoefficient = {
  "News": 4,
  "Entertainment": 5,
  "ProMessage": 6,
  "Data": 6,
  "Education": 7,
  "Advertisement": 3
}

var subStyleCoeefficient = {
  "Banner: Small": 2,
  "Banner: Medium": 3,
  "Banner: Large": 3,
  "Interstitial": 5,
  "Overlay": 4
}

var subPlanCoeefficient = {
  "CPC": 2,
  "CPV": 1
}

function getApprovedSubcampaigns(callback) {
  var campaign = app.models.campaign
  var filter = {
    'where': {
      'status': {
        'inq': [statusConfig.approved, statusConfig.started]
      }
    },
    'include': {'relation': 'subcampaigns'}
  }
  campaign.find(filter, function (err, campaigns) {
    if (err)
      return callback(err, null)
    var subcampaignArray = []
    for (var i = 0; i < campaigns.length; i++)
      for (var j = 0; j < campaigns[i].toJSON().subcampaigns.length; j++)
        subcampaignArray.push(campaigns[i].toJSON().subcampaigns[j].id)
    if (subcampaignArray.length == 0)
      return callback(new Error('zero subcampaigns'), null)
    return callback(null, subcampaignArray)
  })
}

function calculateRanking(specificSubcampaign, callback) {
  getApprovedSubcampaigns(function (err, subcampaignsInst) {
    if (err)
      return callback(err, null)
    var subcampaign = app.models.subcampaign
    subcampaign.find({'where':{'id': {'inq': subcampaignsInst}}, 'order': 'weight DESC'}, function(err, subcampaigns) {
      if (err)
        return callback(err, null)
      for (var i = 0; i < subcampaigns.length; i++) {
        if (!specificSubcampaign) {
          var counter = 0;
          subcampaigns[i].updateAttribute('ranking', i + 1, function (err, result) {
            if (err)
              return callback(err, null)
            counter++
            if (counter == subcampaigns.length)
              return callback(null, 'successful ranking')
          })
        } else {
          if (subcampaigns[i].id == specificSubcampaign.id)
            return callback(null, i)
        }
      }
    })
  })
}

function calculateWeightCampaignAndSubcampaigns(campaign, writeBackEnable, callback) {
  var duration = campaign.endingTime - campaign.beginningTime
  var mediaCoeff = mediaStyleCoefficient[campaign.mediaStyle]
  var subcampaign = app.models.subcampaign
  subcampaign.find({'where':{'campaignId': campaign.id}}, function(err, subcampaigns) {
    if (err)
      return callback(err, null)
    var counter = 0
    for (var i = 0; i < subcampaigns.length; i++) {
      var weight = (mediaCoeff / duration) * (subcampaigns[i].price * subcampaigns[i].minBudget * subStyleCoeefficient[subcampaigns[i].style] * subPlanCoeefficient[subcampaigns[i].plan]) * (1000000000000)
      if (writeBackEnable) {
        subcampaigns[i].updateAttribute('weight', weight, function (err, result) {
          if (err)
            return callback(err, null)
          counter++
          if (counter == subcampaigns.length)
            return callback(null, 'weight calculated and wrote back')
        })
      }
    }
    if (!writeBackEnable)
      return callback(null, 'weight calculated but has noe been wrote back')
  })
}

module.exports = {
  setRankingAndWeight(campaign, callback) {
    calculateWeightCampaignAndSubcampaigns(campaign, true, function (err, result) {
      if (err)
        return callback(err, null)
      calculateRanking(null, function (err, result) {
        if (err)
          return callback(err, null)
        callback(null, 'successfull weight and ranking')
      })
    })
  },

  recalculateRankingAndWeight(callback) {
    calculateRanking(null, function (err, result) {
      if (err)
        return callback(err, null)
      callback(null, 'successfull weight and ranking')
    })
  }
}
