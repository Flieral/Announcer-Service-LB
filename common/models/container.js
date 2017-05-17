var utility = require('../../public/utility.js')

var statusJson = require('../../config/status')
var CONTAINERS_URL = '/api/containers/'

var fs = require('fs')
var path = require('path')

var template0Handler = require('../modules/template0Handler')

var template0Handler = require('../modules/template0Handler')
var template100Handler = require('../modules/template100Handler')

var methodDisabler = require('../../public/methodDisabler.js')
var relationMethodPrefixes = [
  'upload',
]

module.exports = function (container) {

  methodDisabler.disableOnlyTheseMethods(container, relationMethodPrefixes)

  function writeBack(file, inputData, cb) {
    fs.writeFile(file, inputData, function (err) {
      if (err)
        return cb(err, null)
    })
  }

  function updateStatus(subcampaignHashId, fileURL, filePath, isStatic, cb) {
    var subcampaign = container.app.models.subcampaign
    var status = isStatic ? statusJson.pending : statusJson.approved
    subcampaign.findById(subcampaignHashId, function (err, subcampaignInst) {
      if (err)
        return cb(err, null)
      subcampaignInst.updateAttributes({
        'fileURL': fileURL,
        'filePath': filePath,
        'status': status
      }, function (err, response) {
        if (err)
          return cb(err, null)
        return cb(null, response)
      })
    })
  }

  container.uploadFile = function (ctx, subcampaignHashId, isStatic, templateId, data, cb) {
    if (options.isStatic) {
      container.upload(ctx.req, ctx.result, options, function (err, fileObj) {
        if (err)
          return cb(err, null)
        var fileInfo = fileObj.files.file[0]
        var directory = path.resolve(__dirname + '/../filebank/subFiles/')
        var filePath = directory + '/' + fileInfo.container + '/' + fileInfo.name
        switch (templateId) {
          case 0:
            template0Handler.fileValidator(fileInfo, function (err, result) {
              if (err)
                return cb(err, null)
              utility.base64FileEncoding(filePath, function (err, base64Data) {
                if (err)
                  return cb(err, null)
                template0Handler.mergeDataWithTemplate(base64Data, app.templates['template0'], function (err, response) {
                  if (err)
                    return cb(err, null)
                  var fp = directory + '/' + fileInfo.container + '/' + subcampaignHashId + '.html'
                  var fileURL = CONTAINERS_URL + fileInfo.container + '/download/' + subcampaignHashId + '.html'
                  writeBack(fp, response, function (err, writeObject) {
                    if (err)
                      return cb(err, null)
                    updateStatus(subcampaignHashId, fileURL, fp, isStatic, function (err, response) {
                      if (err)
                        return cb(err, null)
                      container.removeFile(fileInfo.container, fileInfo.name, function (err) {
                        if (err)
                          return cb(err, null)
                        return cb(response, null)
                      })
                    })
                  })
                })
              })
            })
            break
          default:
            return cb(new Error('Default in Switch'), null) 
        }
      })
    }
    else {
      if (!data)
        return cb(new Error('Data is Empty'), null)
      switch (templateId) {
        case 100:
          template100Handler.inputValidator(data, function (err, result) {
            if (err)
              return cb(err, null)
            template100Handler.mergeDataWithTemplate(data, app.templates['template100'], function (err, response) {
              if (err)
                return cb(err, null)
              var directory = path.resolve(__dirname + '/../filebank/subFiles/')
              var fp = directory + '/' + fileInfo.container + '/' + subcampaignHashId + '.html'
              var fileURL = CONTAINERS_URL + fileInfo.container + '/download/' + subcampaignHashId + '.html'
              writeBack(fp, response, function (err, writeObject) {
                if (err)
                  return cb(err, null)
                updateStatus(subcampaignHashId, fileURL, fp, isStatic, function (err, response) {
                  if (err)
                    return cb(err, null)
                  return cb(response, null)
                })
              })
            })
          })
          break
        default:
          return cb(new Error('Default in Switch'), null) 
      }
    }
  }

  container.remoteMethod('uploadFile', {
      description: 'Uploads a file',
      accepts: [{
          arg: 'ctx',
          type: 'object',
          http: {
            source: 'context'
          }
        },
        {
          arg: 'subcampaignHashId',
          type: 'string',
          required: true,
          http: {
            source: 'query'
          }
        },
        {
          arg: 'isStatic',
          type: 'Boolean',
          default: false,
          http: {
            source: 'query'
          }
        },
        {
          arg: 'templateId',
          type: 'number',
          default: 0,
          http: {
            source: 'query'
          }
        },
        {
          arg: 'data',
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
        verb: 'POST'
      }
    }
  )
}
