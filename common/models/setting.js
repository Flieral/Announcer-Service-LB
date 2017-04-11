var priorityList = require('../../config/priority.json')

module.exports = function (setting) {

  setting.validatesInclusionOf('priority', { in: priorityList })
}