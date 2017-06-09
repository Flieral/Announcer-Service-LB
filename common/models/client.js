var config = require('../../server/config.json')
var path = require('path')
var utility = require('../../public/utility.js')
var accountType = require('../../config/accountType')

var PRODUCTION = false

var methodDisabler = require('../../public/methodDisabler.js')
var relationMethodPrefixes = [
  'createChangeStream',
  'upsertWithWhere',
  'patchOrCreate',
  'exists',
  'prototype.patchAttributes'
]

var countryList = require('../../config/country.json')
var statusJson = require('../../config/status.json')

var app = require('../../server/server')
var roleManager = require('../../public/roleManager')

var rankingHelper = require('../helpers/rankingHelper')

module.exports = function (client) {

  methodDisabler.disableOnlyTheseMethods(client, relationMethodPrefixes)

  client.validatesLengthOf('password', {
    min: 6
  })
  client.validatesInclusionOf('registrationCountry', { in: countryList
  })

  // Decrypt Password for Front/Back Communications
  client.beforeRemote('login', function (ctx, modelInstance, next) {
    if (PRODUCTION) {
      var pass1 = utility.base64Decoding(ctx.args.credentials.password).toString()
      var pass2 = utility.base64Decoding(ctx.req.body.password).toString()
      ctx.args.credentials.password = pass1
      ctx.req.body.password = pass2
    }
    if (ctx.args.credentials.email || ctx.req.body.email) {
      ctx.args.credentials.email = ctx.args.credentials.email.toLowerCase()
      ctx.req.body.email = ctx.req.body.email.toLowerCase()
    }
    return next()
  })

  client.afterRemote('login', function (ctx, modelInstance, next) {
    roleManager.getRolesById(app, modelInstance.userId, function (err, result) {
      if (err)
        return next(err)
      if (result.roles.length == 0) {
        client.findById(modelInstance.userId, function (err, result) {
          if (err)
            return next(err)
          if (result.clientType.indexOf('Announcer') <= -1) {
            var oldSet = []
            oldSet = result.clientType
            oldSet.push('Announcer')
            result.updateAttribute('clientType', oldSet, function (err, response) {
              if (err)
                return next(err)
              return next()
            })        
          }
          else        
            return next()
        })
      }
      else 
        return next()
    })
  })


  client.beforeRemote('create', function (ctx, modelInstance, next) {
    if (PRODUCTION) {
      var pass1 = utility.base64Decoding(ctx.args.data.password).toString()
      var pass2 = utility.base64Decoding(ctx.req.body.password).toString()
      ctx.args.data.password = pass1
      ctx.req.body.password = pass2
    }
    var whiteList = ['companyName', 'email', 'username', 'password', 'time', 'registrationCountry', 'registrationIPAddress']
    if (!utility.inputChecker(ctx.args.data, whiteList))
      return next(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()))
    else {
      ctx.args.data.email = ctx.args.data.email.toLowerCase()
      ctx.args.data.announcerAccountModel = {}
      ctx.args.data.announcerAccountModel.budget = 0
      ctx.args.data.announcerAccountModel.type = accountType.free
      ctx.args.data.publisherAccountModel = {}
      ctx.args.data.publisherAccountModel.credit = 0
      ctx.args.data.publisherAccountModel.type = accountType.free
      ctx.args.data.clientType = []
      return next()
    }
  })

  client.beforeRemote('prototype.__update__announcerAccount', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()

    client.findById(ctx.req.params.id, function (err, result) {
      if (err)
        return next(err)
      ctx.args.data.budget += result.announcerAccountModel.budget
      return next()
    })
  })

  client.beforeRemote('changePassword', function (ctx, modelInstance, next) {
    if (PRODUCTION) {
      var pass1 = utility.base64Decoding(ctx.args.data.password).toString()
      var pass2 = utility.base64Decoding(ctx.req.body.password).toString()
      var conf1 = utility.base64Decoding(ctx.args.data.confirmation).toString()
      var conf2 = utility.base64Decoding(ctx.req.body.confirmation).toString()
      ctx.args.data.password = pass1
      ctx.req.body.password = pass2
      ctx.args.data.confirmation = conf1
      ctx.req.body.confirmation = conf2
    }
    return next()
  })

  client.beforeRemote('prototype.__create__campaigns', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    var whiteList = ['budget', 'beginningTime', 'endingTime', 'name', 'startStyle', 'mediaStyle']
    if (!utility.inputChecker(ctx.args.data, whiteList))
      return next(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()))
    else {
      ctx.args.data.clientId = ctx.args.options.accessToken.userId
      ctx.args.data.status = statusJson.pending
      if (!(ctx.args.data.endingTime > ctx.args.data.beginningTime + 604800000) || !(ctx.args.data.beginningTime > utility.getUnixTimeStamp()))
        return next(new Error('Error in Date Times'))
      client.findById(ctx.req.params.id, function (err, result) {
        if (err)
          return next(err)
        if (ctx.args.data.budget == 0)
          return next(new Error('Error in Budget (Zero)'))  
        var campaign = app.models.campaign
        campaign.find({ where: { 'clientId': ctx.args.data.clientId } }, function (err, campaignList) {
          if (err)
            return next(err)
          var curBudget = 0
          for (var i = 0; i < campaignList.length; i++)
            curBudget += campaignList[i].budget
          if (curBudget + ctx.args.data.budget > result.announcerAccountModel.budget)
            return next(new Error('Error in Budget'))
          return next()
        })
      })
    }
  })

  client.afterRemote('prototype.__create__campaigns', function (ctx, modelInstance, next) {
    var option = {}
    option.name = '' + modelInstance.id
    app.models.container.createContainer(option, function (err, container){
      if (err)
        return next(err)
      return next()
    })
  })

  client.beforeRemote('prototype.__destroyById__campaigns', function (ctx, modelInstance, next) {
    var campaign = app.models.campaign
    campaign.findById(ctx.req.params.fk, function (err, response) {
      if (err)
        return next(err)
      if (modelInstance.status !== statusJson.started)
        next()
      else
        next(new Error('campaign should not be started'))
    })
  })

  client.afterRemote('prototype.__destroyById__campaigns', function (ctx, modelInstance, next) {
    var container = '' + ctx.args.fk
    app.models.container.destroyContainer(container, function (err){
      if (err)
        return next(err)
      rankingHelper.recalculateRankingAndWeight(function(err, result) {
        if (err)
          console.error(err)
        console.log(result)
      })
      return next()
    })
  })
  
  client.beforeRemote('prototype.__updateById__campaigns', function (ctx, modelInstance, next) {
    roleManager.getRolesById(app, ctx.args.options.accessToken.userId, function (err, result) {
      if (err)
        return next(err)
      if (result.roles.length == 0) {
        var whiteList = ['budget', 'beginningTime', 'endingTime', 'name', 'status']
        if (utility.inputChecker(ctx.args.data, whiteList)) {
          var callbackFired = false
          var campaign = app.models.campaign
          campaign.findById(ctx.req.params.fk, function (err, response) {
            if (err)
              return next(err)
            if (ctx.args.data.status) {
              var validStatus = [statusJson.stopped, statusJson.unstopped]
              if (validStatus.indexOf(ctx.args.data.status) <= -1)
                return next(new Error('Whitelist Input Error for Status'))
              if (ctx.args.data.status !== statusJson.stopped && response.status === statusJson.started)
                return next(new Error('Stopping Only Started Campaigns are Allowed'))
              if (ctx.args.data.status !== statusJson.unstopped && response.status === statusJson.stopped)
                return next(new Error('Unstopping Only Stopped Campaigns are Allowed'))
              if (ctx.args.data.status === statusJson.unstopped && response.status === statusJson.stopped)
                ctx.args.data.status = statusJson.started
            }

            if (ctx.args.data.endingTime && ctx.args.data.beginningTime) {
              if (ctx.args.data.beginningTime < utility.getUnixTimeStamp())
                return next(new Error('Beginning Time Can not be Less than Now'))
              if ((ctx.args.data.endingTime - ctx.args.data.beginningTime < 604800000) || (ctx.ats.data.endingTime < utility.getUnixTimeStamp()))
                return next(new Error('Ending Time Can not be Less than Now Or Duration Problem'))
            }

            if (!ctx.args.data.endingTime && ctx.args.data.beginningTime) {
              if (ctx.args.data.beginningTime < utility.getUnixTimeStamp())
                return next(new Error('Beginning Time Can not be Less than Now'))
              if (response.endingTime - ctx.args.data.beginningTime < 604800000)
                return next(new Error('Duration Problem'))
            }

            if (ctx.args.data.endingTime && !ctx.args.data.beginningTime) {
              if (ctx.args.data.endingTime < utility.getUnixTimeStamp())
                return next(new Error('Ending Time Can not be Less than Now'))
              if (ctx.args.data.endingTime - response.beginningTime < 604800000)
                return next(new Error('Duration Problem'))
            }

            if (ctx.args.data.budget) {
              callbackFired = true
              client.findById(ctx.req.params.id, function (err, result) {
                if (err)
                  return next(err)
                campaign.find({ where: { 'clientId': ctx.req.params.id } }, function (err, campaignList) {
                  if (err)
                    return next(err)
                  var curBudget = 0
                  for (var i = 0; i < campaignList.length; i++) {
                    if (campaignList[i].id == ctx.req.params.fk)
                      continue
                    curBudget += campaignList[i].budget
                  }
                  if (ctx.args.data.budget == 0)
                    return next(new Error('Error in Budget (Zero)'))
                  if (curBudget + ctx.args.data.budget > result.announcerAccountModel.budget)
                    return next(new Error('Error in Budget (Account)'))
                  var subcampaign = app.models.subcampaign
                  subcampaign.find({ where: { 'campaignId': ctx.req.params.fk } }, function (err, subcampaignList) {
                    if (err)
                      return next(err)
                    var curCampBudget = 0
                    for (var i = 0; i < subcampaignList.length; i++)
                      curCampBudget += subcampaignList[i].minBudget
                    if (ctx.args.data.budget < curCampBudget)
                      return next(new Error('Error in Budget (Subcampaign)'))
                    return next()
                  })
                })
              })
            }

            if (!callbackFired)
              return next()
          })
        } else
          return next(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()))
      } else {
        ctx.args.data.clientId = ctx.req.params.id
        return next()
      }
    })
  })

  client.afterRemote('prototype.__updateById__campaigns', function (ctx, modelInstance, next) {
    function changeSubcampaignStatus(campaignId, status, callback) {
      var subcampaign = app.models.subcampaign
      subcampaign.updateAll({'where': {'campaignId': campaignId}}, {'status': status}, function(err, result, count) {
        if (err)
          return callback(err, null)
        return callback(null, result)
      })
    }
    if (modelInstance.status === statusJson.started) {
      changeSubcampaignStatus(modelInstance.id, statusJson.approved, function(err, result) {
        if (err)
          return next(err)
        rankingHelper.setRankingAndWeight(modelInstance, function(err, result) {
          if (err)
            console.error(err)
          console.log(result)
        })
        return next()
      })
    }
    else if (modelInstance.status === statusJson.stopped) {
      changeSubcampaignStatus(modelInstance.id, statusJson.stopped, function(err, result) {
        if (err)
          return next(err)
        rankingHelper.recalculateRankingAndWeight(function(err, result) {
          if (err)
            console.error(err)
          console.log(result)
        })
        return next()
      })
    }
    else
      next()
  })

  client.beforeRemote('replaceById', function (ctx, modelInstance, next) {
    var whiteList = ['companyName']
    if (utility.inputChecker(ctx.args.data, whiteList))
      return next()
    else
      return next(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()))
  })

  // Change Password Remote Method 
  client.changePassword = function (data, req, res, cb) {
    if (!req.accessToken)
      return res.sendStatus(401)

    //verify passwords match
    if (!req.body.password || !req.body.confirmation ||
      req.body.password !== req.body.confirmation) {
      return res.sendStatus(400, new Error('Passwords do not match'))
    }

    client.findById(req.accessToken.userId, function (err, user) {
      if (err) return res.sendStatus(404)
      user.updateAttribute('password', req.body.password, function (err, user) {
        if (err) return res.sendStatus(404)
        console.log('> password reset processed successfully');
        res.render('response', {
          title: 'Password reset success',
          content: 'Your password has been reset successfully',
          redirectTo: '/',
          redirectToLinkText: 'Log in'
        })
      })
    })
  }

  client.remoteMethod('changePassword', {
    accepts: [{
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      }
    }, {
      arg: 'req',
      type: 'object',
      http: {
        source: 'req'
      }
    }, {
      arg: 'res',
      type: 'object',
      http: {
        source: 'res'
      }
    }],
    description: 'change password method with accessToken',
    http: {
      path: '/changePassword',
      verb: 'POST',
      status: 200,
      errorStatus: 400
    },
    returns: {
      arg: 'response',
      type: 'string'
    }
  })

  //send verification email after registration
  client.afterRemote('create', function (context, userInstance, next1) {
    var options = {
      type: 'email',
      to: userInstance.email,
      from: 'noreply@Flieral.com',
      subject: 'Thanks for Registering.',
      user: client
    }

    userInstance.verify(options, function (err, response, next) {
      if (err) return next1(err)

      console.log('> verification email sent:', response)

      context.res.render('response', {
        title: 'Signed up successfully',
        content: 'Please check your email and click on the verification link before logging in.',
        redirectTo: '/',
        redirectToLinkText: 'Log in'
      })
    })
  })

  //send password reset link when requested
  client.on('resetPasswordRequest', function (info) {
    var url = 'http://' + config.host + ':' + config.port + '/reset-password'
    var html = 'Click <a href="' + url + '?access_token=' +
      info.accessToken.id + '">here</a> to reset your password'

    client.app.models.Email.send({
      to: info.email,
      from: info.email,
      subject: 'Password Reset',
      html: html
    }, function (err) {
      if (err) return next(err)
    })
  })

  client.getRefinement = function (accountHashID, cb) {
    var filter = {
      include: 'campaigns'
    }
    client.findById(accountHashID, filter, function(err, result) {
      if (err)
        return cb(err)
      var finishedCampaignsCounter = 0
      for (var i = 0; i < result.campaigns.length; i++)
        if (result.toJSON().campaigns[i].status === statusJson.finished)
          finishedCampaignsCounter++
      if (finishedCampaignsCounter == result.campaigns.length) {
        var subcampaign = app.models.subcampaign
        var subFilter = {
          where: {
            'clientId': accountHashID
          }
        }
        subcampaign.find(subFilter, function(err, subcampainList) {
          if (err)
            return cb(err)
          var totalSubs = 0
          for (var i = 0; i < subcampainList.length; i++)
            totalSubs += subcampainList[i].budget
          var remaining = result.announcerAccountModel.budget - totalSubs
          if (remaining == 0)
            return cb(new Error('no remaining money budget. balance is 0.'))
          else
            return cb(null, remaining)
        })
      }
      else {
        cb(new Error('campaigns are not totally finished'))
      }
    })
  }

  client.remoteMethod('getRefinement', {
    accepts: [{
      arg: 'accountHashID',
      type: 'string',
      required: true,
      http: {
        source: 'query'
      }
    }],
    description: 'return refine remaining budget balance',
    http: {
      path: '/:accountHashID/getRefinement',
      verb: 'POST',
      status: 200,
      errorStatus: 400
    },
    returns: {
      arg: 'response',
      type: 'object'
    }
  })

  client.doRefinement = function (accountHashID, cb) {
    var campaign = app.models.campaign
    var filter = {
      'where': {
        'clientId': accountHashID
      },
      'include': 'subcampaigns'
    }
    campaign.find(filter, function(err, campaigns) {
      if (err)
        return cb(err)
      var campCounter = 0
      var totalBudget = 0
      for (var i = 0; i < campaigns.length; i++) {
        var campBudget = 0
        for (var j = 0; j < campaigns[i].toJSON().subcampaigns.length; j++)
          campBudget += campaigns[i].toJSON().subcampaigns[j].minBudget
        totalBudget += campBudget
        campaigns[i].updateAttribute('budget', campBudget, function(err, result) {
          if (err)
            return cb(err)
          campCounter++
          if (campCounter == campaigns.length) {
            client.announcerAccountModel.update({'budget': totalBudget}, function(err, result) {
              if (err)
                return cb(err)
              return cb(null, 'refinement done')
            })
          }
        })
      }
    })
  }

  client.remoteMethod('doRefinement', {
    accepts: [{
      arg: 'accountHashID',
      type: 'string',
      required: true,
      http: {
        source: 'query'
      }
    }],
    description: 'do refining budget balance',
    http: {
      path: '/:accountHashID/doRefinement',
      verb: 'POST',
      status: 200,
      errorStatus: 400
    },
    returns: {
      arg: 'response',
      type: 'object'
    }
  })

}
