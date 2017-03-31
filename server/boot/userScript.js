var methodDisabler = require('../../public/methodDisabler.js')
var relationMethodPrefixes = [
  'login',
  'logout'
]

module.exports = function (app) {
  var User = app.models.client
  var Role = app.models.Role
  var RoleMapping = app.models.RoleMapping

  var users = [{
      id: 98989878,
      username: 'MrWooJ',
      email: 'CEO@Flieral.com',
      password: 'Fl13r4lAlirezaPass',
      time: 1234567891,
      companyName: "Flieral",
      registrationCountry: "US",
      registrationIPAddress: "0.0.0.0",
      emailVerified: true
    },
    {
      id: 98989857,
      username: 'Mohammad4x',
      email: 'CTO@Flieral.com',
      password: 'Fl13r4lMohammadPass',
      time: 1234567891,
      companyName: "Flieral",
      registrationCountry: "US",
      registrationIPAddress: "0.0.0.0",
      emailVerified: true
    },
    {
      id: 98989873,
      username: 'Support',
      email: 'Support@Flieral.com',
      password: 'Fl13r4lSupportPass',
      time: 1234567891,
      companyName: "Flieral",
      registrationCountry: "US",
      registrationIPAddress: "0.0.0.0",
      emailVerified: true
    }
  ]

  User.replaceOrCreate(users, null, function (err, users) {
    if (err)
      throw err

    var role1 = {
      name: 'founder'
    }
    Role.create(role1, function (err, role) {
      if (err)
        throw err
      role.principals.create({
        principalType: RoleMapping.USER,
        principalId: users[0].id
      }, function (err, principal) {
        if (err)
          throw err
      })
      role.principals.create({
        principalType: RoleMapping.USER,
        principalId: users[1].id
      }, function (err, principal) {
        if (err)
          throw err
      })
    })

    var role2 = {
      name: 'admin'
    }
    Role.create(role2, function (err, role) {
      if (err)
        throw err
      role.principals.create({
        principalType: RoleMapping.USER,
        principalId: users[2].id
      }, function (err, principal) {
        if (err)
          throw err
      })
    })
  })

}
