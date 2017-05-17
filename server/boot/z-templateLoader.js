var fs = require('fs')
var path = require('path')

module.exports = function (app) {
  var directory = path.resolve(__dirname + '/../../templates/')
  var templates = app.templates = {}
  fs.readdir(directory, function (err, files) {
    if (err)
      throw err
    files.forEach(function (file) {
      fs.open(directory + '/' + file, 'r+', function (err, fd) {
        if (err)
          throw err
        fs.readFile(fd, function (err, data) {
          if (err)
            throw err
          templates[file.slice(0, -5)] = data.toString()
          fs.close(fd, function (err) {
            if (err)
              throw err
          })
        })
      })
    })
  })
}
