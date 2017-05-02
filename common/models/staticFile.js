'use strict'
var statusJson = require('../../config/status')
var CONTAINERS_URL = '/api/containers/'

module.exports = function (StaticFile) {

  StaticFile.uploadFile = function (ctx, options, cb) {
    StaticFile.app.models.container.upload(ctx.req, ctx.result, options, function (err, fileObj) {
      if (err)
        return cb(err)
      else {
        // Here myFile is the field name associated with upload. You should change it to something else if you
        var fileInfo = fileObj.files.myFile[0]
        StaticFile.create({
          name: fileInfo.name,
          type: fileInfo.type,
          container: fileInfo.container,
          clientId: ctx.req.accessToken.userId,
          url: CONTAINERS_URL + fileInfo.container + '/download/' + fileInfo.name // This is a hack for creating links
        }, function (err, obj) {
          if (err) {
            console.log('Error in uploading' + err)
            return cb(err)
          } else {
            var subcampaign = StaticFile.app.models.subcampaign
            subcampaign.findById(options.subcampaignId, function (err, subcampaignInst) {
              if (err)
                throw err
              subcampaignInst.updateAttributes({ 'fileURL': CONTAINERS_URL + fileInfo.container + '/download/' + fileInfo.name, 'status': statusJson.pending }, function (err, response) {
                if (err)
                  throw err
                return cb(null, obj)
              })
            })
          }
        })
      }
    })
  }

  StaticFile.remoteMethod(
    'uploadFile', {
      description: 'Uploads a file',
      accepts: [{
          arg: 'ctx',
          type: 'object',
          http: {
            source: 'context'
          }
        },
        {
          arg: 'options',
          type: 'object',
          http: {
            source: 'query'
          }
        }
      ],
      returns: {
        arg: 'fileObject',
        type: 'object',
        root: true
      },
      http: {
        verb: 'post'
      }
    }

  )
}
