var config = require('../../server/config.json')
var path = require('path')
var utility = require('../../public/utility.js')

var PRODUCTION = false

var methodDisabler = require('../../public/methodDisabler.js')
var relationMethodPrefixes = [
  'createChangeStream',
  'upsertWithWhere',
  'patchOrCreate',
  'exists'
]

var countryList = require('../../config/country.json')
var statusJson = require('../../config/status.json')

var app = require('../../server/server')
var roleManager = require('../../public/roleManager')

module.exports = function (client) {

  methodDisabler.disableOnlyTheseMethods(client, relationMethodPrefixes)

  client.validatesLengthOf('password', {min: 6})
  client.validatesInclusionOf('registrationCountry', {in: countryList})

  // Decrypt Password for Front/Back Communications
  client.beforeRemote('login', function (ctx, modelInstance, next) {
    if (PRODUCTION) {
      var pass1 = utility.base64Decoding(ctx.args.credentials.password).toString()
      var pass2 = utility.base64Decoding(ctx.req.body.password).toString()
      ctx.args.credentials.password = pass1
      ctx.req.body.password = pass2
    }
    return next()
  })

  client.beforeRemote('create', function (ctx, modelInstance, next) {
    if (PRODUCTION) {
      var pass1 = utility.base64Decoding(ctx.args.data.password).toString()
      var pass2 = utility.base64Decoding(ctx.req.body.password).toString()
      ctx.args.data.password = pass1
      ctx.req.body.password = pass2
    }
    ctx.args.data.announcerAccountModel = {}
    ctx.args.data.announcerAccountModel.budget = 0
    ctx.args.data.announcerAccountModel.type = 'Free'
    ctx.args.data.publisherAccountModel = {}
    ctx.args.data.publisherAccountModel.credit = 0
    ctx.args.data.publisherAccountModel.type = 'Free'
    return next()
  })

  client.beforeRemote('prototype.__update__announcerAccount', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()

    client.findById(ctx.req.params.id, function (err, result) {
      if (err)
        throw err
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
    ctx.args.data.credit = 0
    ctx.args.data.clientId = ctx.args.options.accessToken.userId
    ctx.args.data.status = statusJson.pending
    ctx.args.data.message = 'Campaign Pending Approval'
    if (!(ctx.args.data.endingTime > ctx.args.data.beginningTime) || !(ctx.args.data.beginningTime > utility.getUnixTimeStamp()))
      return next(new Error('Error in Date Times'))
    client.findById(ctx.req.params.id, function (err, result) {
      if (err)
        throw err
      var curBudget = 0
      for (var i = 0; i < result.campaignList; i++)        
        curBudget += result.campaignList[i].budget  
      if (curBudget + ctx.args.data.budget > result.announcerAccountModel.budget)
        return next(new Error('Error in Budget'))
      return next()
    })
  })

  client.beforeRemote('prototype.__updateById__campaigns', function (ctx, modelInstance, next) {
    roleManager.getRolesById(app, ctx.args.options.accessToken.userId, function (err, result) {
      if (err)
        return next(err)
      if (result.length == 0) {
        var whiteList = ['budget', 'beginningTime', 'endingTime', 'name', 'startStyle']
        if (utility.inputChecker(ctx.args.data, whiteList)) {
          var callbackFired = false
          var campaign = app.models.campaign
          campaign.findById(ctx.req.params.fk, function (err, result) {
            if (err)
              throw err
            
            if (ctx.args.data.endingTime && ctx.args.data.beginningTime) {
              if (ctx.args.data.beginningTime < utility.getUnixTimeStamp())
                return next(new Error('Beginning Time Can not be Less than Now'))
              if ((ctx.args.data.endingTime - ctx.args.data.beginningTime < 604800) || (ctx.ats.data.endingTime < utility.getUnixTimeStamp()))
                return next(new Error('Ending Time Can not be Less than Now Or Duration Problem'))
            }

            if (!ctx.args.data.endingTime && ctx.args.data.beginningTime) {
              if (ctx.args.data.beginningTime < utility.getUnixTimeStamp())
                return next(new Error('Beginning Time Can not be Less than Now'))
              if (result.endingTime - ctx.args.data.beginningTime < 604800)
                return next(new Error('Duration Problem'))  
            }

            if (ctx.args.data.endingTime && !ctx.args.data.beginningTime) {
              if (ctx.args.data.endingTime < utility.getUnixTimeStamp())
                return next(new Error('Ending Time Can not be Less than Now'))
              if (ctx.args.data.endingTime - result.beginningTime < 604800)
                return next(new Error('Duration Problem'))  
            }

            if (ctx.args.data.budget) {
              callbackFired = true
              client.findById(ctx.req.params.id, function (err, result) {
                if (err)
                  throw err
                var curBudget = 0
                for (var i = 0; i < result.campaignList; i++)        
                  curBudget += result.campaignList[i].budget  
                if (curBudget + ctx.args.data.budget > result.announcerAccountModel.budget)
                  return next(new Error('Error in Budget (Account)'))
                var curCampBudget = 0
                for (var i = 0; i < result.subcampaignList.length; i++) 
                  curCampBudget += result.subcampaignList[i].minBudget  
                if (ctx.args.data.budget < curCampBudget)
                  return next(new Error('Error in Budget (Subcampaign)'))
                return next()
              })
            }

            if (!callbackFired)
              return next()          
          })
        } else
          return next(new Error('White List Error! Allowed Parameters: ' + whiteList.toString()))
      }
      else {
        ctx.args.data.clientId = ctx.req.params.id
        return next()
      }
    })
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
}
