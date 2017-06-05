module.exports = {
  inputValidator: function (dataInput, callback) {
    if (dataInput)
      if (dataInput.header && dataInput.time && dataInput.holding && dataInput.subtitle)
        return callback(null)
    return callback(new Error('Input Validation for Dynamic Template Handler 100 Failed'))
  },

  mergeDataWithTemplate: function(data, template, callback) {
    const cheerio = require('cheerio')
    const $ = cheerio.load(template)
    $('#FL_Header').text(data.header)
    $('#FL_Holding').text(data.holding)
    $('#FL_Time').text(data.time)
    $('#FL_Subtitle').text(data.subtitle)
    return callback(null, $.html())
  }
}  
