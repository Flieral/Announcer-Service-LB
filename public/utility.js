var fs = require('fs')

module.exports = {
  generateQueryString: function (data) {
    var ret = []
    for (var d in data)
      if (data[d])
        ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]))
    return ret.join("&")
  },

  base64Encoding: function (data) {
    return new Buffer(data).toString('base64')
  },

  base64Decoding: function (data) {
    return new Buffer(data, 'base64')
  },

  getUnixTimeStamp: function () {
    return Math.floor((new Date).getTime())
  },

  stringReplace: function (source, find, replace) {
    return source.replace(find, replace)
  },

  inputChecker: function (reqInput, whiteList) {
    var input = Object.keys(reqInput)
    for (var i = 0; i < input.length; i++)
      if (whiteList.indexOf(input[i]) <= -1)
        return false
    return true
  },

  JSONIterator: function (input, validator) {
    for (var i = 0; i < input.length; i++)
      if (validator.indexOf(input[i]) == -1)
        return false
    return true
  },

  base64FileEncoding: function (file, callback) {
    fs.open(file, 'r+', function (err, fd) {
      if (err)
        return callback(err, null)
      fs.readFile(fd, function (err, original_data) {
        if (err)
          return callback(err, null)
        var base64Image = new Buffer(original_data, 'binary').toString('base64')
        fs.close(fd, function (err) {
          if (err)
            callback(err, null)
          return callback(null, base64Image)
        })
      })
    })
  }
}
