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
  "Banner: Medium":3,
  "Banner: Large": 3,
  "Interstitial": 5,
  "Overlay": 4
}

var subPlanCoefficient = {
  "CPC": 2,
  "CPV": 1
}

function getApprovedSubcampaigns(callback) {
	var campaign = app.models.campaign
	var filter = {
		'where' : {
			'status': { inq: [statusConfig.approved, statusConfig.started]},
		},
		'include' : 'subcampaigns'
	}
	campaign.find(filter, function(err, campaigns) {
		if (err)
			return callback(err, null)
		var subcampaignArray = []
		for (var i = 0; i < campaigns.length; i++)
			for (var j = 0; j < campaigns[i].subcampaigns.length; j++)
				subcampaignArray.push(campaigns[i].subcampaigns[j])
		var subFilter = {
			'order': 'weight DESC'
		}
		var subs = applyFilter(subcampaignArray, { 'order': 'weight DESC' })
		return callback(null, subs)
	})
}

function calculateRanking(specificSubcampaign, callback) {
	getApprovedSubcampaigns(function(err, subcampaigns) {
		if (err)
			return callback(err, null)
		for (var i = 0; i < subcampaigns.length; i++) {
			if (!specificSubcampaign) {
				subcampaigns[i].updateAttribute({'ranking': i + 1}, function(err, result) {
					if (err)
						return callback(err, null)
					if (i == subcampaigns.length)
						return callback(null, 'successful ranking')
				})
			}
			else {
				if (subcampaigns[i].id == specificSubcampaign.id)
					return callback(null, i)
			}
		}
	})
}

function calculateWeightCampaignAndSubcampaigns(campaign, writeBackEnable, callback) {
	var duration = campaign.endingTime - campaign.beginningTime
	var mediaCoeff = mediaStyleCoefficient[campaign.style]
	campaign.subcampaigns.forEach(function(subcampaign) {
		var weight = (mediaCoeff / duration) * (subcampaign.price * subcampaign.minBudget * subStyleCoeefficient[subcampaign.style] * subPlanCoeefficient[subcampaign.plan])
		if (writeBackEnable) {
			campaign.subcampaign.updateAttribute({'weight': weight}, function(err, result) {
				if (err)
					return callback(err, null)
				return callback(result)
			})
		}
		else
			return callback(err, weight)
	})
}

module.exports = {
	setRankingAndWeight(campaign, callback) {
		calculateWeightCampaignAndSubcampaigns(campaign, true, function(err, result) {
			if (err)
				return callback(err, null)
			calculateRanking(null, function(err, result) {
				if (err)
					return callback(err, null)
				callback(null, 'successfull weight and ranking')
			})
		})
	},

	recalculateRankingAndWeight(callback) {
		calculateRanking(null, function(err, result) {
			if (err)
				return callback(err, null)
			callback(null, 'successfull weight and ranking')
		})	
	}
}
