'use strict'
var fs = require('fs')
var statusJson = require('../../config/status')
var CONTAINERS_URL = '/api/containers/'

function buildHtml() {
  var header = '';
  var body = '';

  // concatenate header string
  // concatenate body string

  return '<!DOCTYPE html>' +
    '<html><header>' + header + '</header><body>' + body + '</body></html>';
};

module.exports = function (DynamicFile) {




DynamicFile.uploadFile = function (ctx, options, cb) {
  var tempPath = '../../filebank/templates/'
  var template = tempPath + options.tempname + '.html'
  var stream = fs.createReadStream(template, {
    autoClose: true
  })
  stream.once('open', function (fd) {
    var html = buildHtml()
    
  })
  var fileInfo = fileObj.files.myFile[0]
  DynamicFile.create({
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
      var subcampaign = DynamicFile.app.models.subcampaign
      subcampaign.findById(options.subcampaignId, function (err, subcampaignInst) {
        if (err)
          throw err
        subcampaignInst.updateAttributes({
          'fileURL': CONTAINERS_URL + fileInfo.container + '/download/' + fileInfo.name,
          'status': statusJson.pending
        }, function (err, response) {
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

DynamicFile.remoteMethod(
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
