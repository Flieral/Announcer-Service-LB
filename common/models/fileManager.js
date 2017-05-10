var statusJson = require('../../config/status')
var CONTAINERS_URL = '/api/containers/'

module.exports = function (fileManager) {

  fileManager.uploadFile = function (ctx, options, cb) {
    fileManager.app.models.container.upload(ctx.req, ctx.result, options, function (err, fileObj) {
      if (err)
        return cb(err)
      else {
        var fileInfo = fileObj.files.file[0]
        fileManager.create({
          name: fileInfo.name,
          type: fileInfo.type,
          container: fileInfo.container,
          clientId: ctx.req.accessToken.userId,
          url: CONTAINERS_URL + fileInfo.container + '/download/' + fileInfo.name
        }, function (err, obj) {
          if (err) {
            console.log('Error in uploading' + err)
            return cb(err)
          } else {
            var subcampaign = fileManager.app.models.subcampaign
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

  fileManager.remoteMethod(
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
