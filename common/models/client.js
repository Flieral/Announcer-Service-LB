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
    next()
  })

  client.beforeRemote('create', function (ctx, modelInstance, next) {
    if (PRODUCTION) {
      var pass1 = utility.base64Decoding(ctx.args.data.password).toString()
      var pass2 = utility.base64Decoding(ctx.req.body.password).toString()
      ctx.args.data.password = pass1
      ctx.req.body.password = pass2
    }
    ctx.args.data.accountModel = {}
    ctx.args.data.accountModel.credit = 0
    ctx.args.data.accountModel.type = 'Free'
    next()
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
    next()
  })

  client.beforeRemote('prototype.__create__publishers', function (ctx, modelInstance, next) {
    if (!ctx.args.options.accessToken)
      return next()
    ctx.args.data.credit = 0
    ctx.args.data.clientId = ctx.args.options.accessToken.userId
    next()    
  })

  client.beforeRemote('prototype.__updateById__publishers', function (ctx, modelInstance, next) {
      if (!ctx.args.options.accessToken)
        return next()
      ctx.args.data.clientId = ctx.args.options.accessToken.userId
      next()
  })

  client.beforeRemote('replaceById', function (ctx, modelInstance, next) {
    var whilteList = ['companyName']
    if (utility.inputChecker(ctx.args.data, whilteList))
      next()
    else
      next(new Error('White List Error! Allowed Parameters: ' + whilteList.toString()))
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
