module.exports = function (app) {
  var ACL = app.models.ACL
  var accessControls = [
		{
      model: 'AccessToken',
      accessType: '*',
      principalType: 'ROLE',
      principalId: '$everyone',
      permission: 'DENY'
    },
    {
      model: 'AccessToken',
      accessType: '*',
      principalType: 'ROLE',
      principalId: 'admin',
      permission: 'ALLOW'
    },
    {
      model: 'AccessToken',
      accessType: '*',
      principalType: 'ROLE',
      principalId: 'founder',
      permission: 'ALLOW'
    }
  ]
  ACL.create(accessControls, function (err, acls) {
    if (err)
      throw err
  })
}
