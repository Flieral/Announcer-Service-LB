module.exports = function (app) {
  var mongoDs = app.dataSources.mongoDs

  var User = app.models.client
  var Role = app.models.Role
  var RoleMapping = app.models.RoleMapping

  var users = [{
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

  function createRoles(users) {
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
  }

  User.create(users, function (err, users) {
    if (err) {
      User.find({
        where: {
          'companyName': 'Flieral'
        }
      }, function (err, users) {
        if (err)
          throw err
        createRoles(users)
      })
    } else
      createRoles(users)
  })

}
