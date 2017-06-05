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

var app = require('../../server/server')
var rankingHelper = require('../helpers/rankingHelper')

module.exports = function (container) {

  methodDisabler.disableOnlyTheseMethods(container, relationMethodPrefixes)

  function writeBack(file, inputData, cb) {
    fs.writeFile(file, inputData, function (err) {
      if (err)
        return cb(err, null)
      return cb(null, 'result')
    })
  }

  function updateStatus(subcampaignHashId, fileURL, filePath, isStatic, cb) {
    var subcampaign = container.app.models.subcampaign
    var campaign = container.app.models.campaign
    var status = isStatic ? statusJson.pending : statusJson.approved
    subcampaign.findById(subcampaignHashId, function (err, subcampaignInst) {
      if (err)
        return cb(err, null)
      var campaignId = subcampaignInst.campaignId;
      subcampaignInst.updateAttributes({
        'fileURL': fileURL,
        'filePath': filePath,
        'status': status
      }, function (err, response) {
        if (err)
          return cb(err, null)
        subcampaign.find({'where':{'campaignId': campaignId}}, function(err, subcampaignList) {
          if (err)
            return cb(err, null)
          var counter = 0
          for (var i = 0; i < subcampaignList.length; i++)
            if (subcampaignList[i].status === statusJson.approved)
              counter++
          if (counter == subcampaignList.length) {
            campaign.findById(campaignId, function(err, campaignInst) {
              if (err)
                return cb(err, null)
              if (campaignInst.status === statusJson.started || campaignInst.status === statusJson.approved) {
                rankingHelper.setRankingAndWeight(result, function(err, result) {
                  if (err)
                    console.error(err)
                  console.log(result)
                })
                return cb(null, response)
              }
              if (campaignInst.status === statusJson.pending) {
                campaignInst.updateAttribute('status', statusJson.approved, function(err, result) {
                  if (err)
                    return cb(err, null)
                  rankingHelper.setRankingAndWeight(result, function(err, result) {
                    if (err)
                      console.error(err)
                    console.log(result)
                  })
                  return cb(null, response)
                })
              }
            })
          }
          else 
            return cb(null, response)
        })
      })
    })
  }

  container.uploadFile = function (ctx, campaignHashId, subcampaignHashId, isStatic, templateId, data, cb) {
    var fdir = path.resolve(__dirname + '/../../filebank/subFiles/' + campaignHashId + '/' + subcampaignHashId + '.html')
    fs.stat(fdir, function(err, stat) {
      if(!err)
          return cb(new Error('Already There is a Content for this Subcampaign'))
      else if(err.code == 'ENOENT') {
        if (isStatic) {
          container.upload(ctx.req, ctx.result, options, function (err, fileObj) {
            if (err)
              return cb(err)
            var fileInfo = fileObj.files.file[0]
            var directory = path.resolve(__dirname + '/../filebank/subFiles/')
            var filePath = directory + '/' + fileInfo.container + '/' + fileInfo.name
            switch (templateId) {
              case 0:
                template0Handler.fileValidator(fileInfo, function (err, result) {
                  if (err)
                    return cb(err)
                  utility.base64FileEncoding(filePath, function (err, base64Data) {
                    if (err)
                      return cb(err)
                    template0Handler.mergeDataWithTemplate(base64Data, app.templates['template0'], function (err, response) {
                      if (err)
                        return cb(err)
                      var fp = directory + '/' + fileInfo.container + '/' + subcampaignHashId + '.html'
                      var fileURL = CONTAINERS_URL + fileInfo.container + '/download/' + subcampaignHashId + '.html'
                      writeBack(fp, response, function (err, writeObject) {
                        if (err)
                          return cb(err)
                        updateStatus(subcampaignHashId, fileURL, fp, isStatic, function (err, response) {
                          if (err)
                            return cb(err)
                          container.removeFile(fileInfo.container, fileInfo.name, function (err) {
                            if (err)
                              return cb(err)
                            return cb(response)
                          })
                        })
                      })
                    })
                  })
                })
                break
              default:
                return cb(new Error('Default in Switch')) 
            }
          })
        }
        else {
          if (!data)
            return cb(new Error('Data is Empty'))
          switch (templateId) {
            case 100:
              template100Handler.inputValidator(data, function (err) {
                if (err)
                  return cb(err)
                template100Handler.mergeDataWithTemplate(data, app.templates['template100'], function (err, response) {
                  if (err)
                    return cb(err)
                  var directory = path.resolve(__dirname + '/../../filebank/subFiles/')
                  var fp = directory + '/' + campaignHashId + '/' + subcampaignHashId + '.html'
                  var fileURL = CONTAINERS_URL + campaignHashId + '/download/' + subcampaignHashId + '.html'
                  writeBack(fp, response, function (err, writeObject) {
                    if (err)
                      return cb(err)
                    updateStatus(subcampaignHashId, fileURL, fp, isStatic, function (err, response) {
                      if (err)
                        return cb(err)
                      return cb(response)
                    })
                  })
                })
              })
              break
            default:
              return cb(new Error('Default in Switch')) 
          }
        }
      }
      else
        return cb(err)
    })
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
          arg: 'campaignHashId',
          type: 'string',
          required: true,
          http: {
            source: 'query'
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
