'use strict';
module.exports = function(authOptions) {
  var express = require('express');
  var app = express();
  var bodyParser = require('body-parser');
  var auth = require('../index');
  
  var userIDName = 'userID';
  var tokenName = 'token';

  if(authOptions) {
    userIDName = authOptions.userIDName || 'userID';
    tokenName = authOptions.tokenName || 'token';
  }

  app.use(bodyParser());
  app.use(auth(authOptions));


  var password = '567890';
  var userID = '4567890';
  var username = 'Bob';

  // this is an endpoint that does not require session. Should be able to access
  // the content
  app.get('/index', function(req, res) {
    res.send('Hello world');
  });
  app.get('/login', function(req, res) {
    if (req.param('password') === password && req.param('username') === username) {
      req.genSession(req);
      // or, if you are more comfortable, req = req.genSession(req);
      req.session[userIDName] = userID;
      var result = {};
      result[tokenName] = req.sessionID;
      result[userIDName] = req.session[userIDName];
      res.send(result);
    } else {
      res.send(401, "password mismatch!");
    }
  });

  // this is an endpoint that requires userID. If there is an userID, it would
  // have been checked with the session database to be a valid userID
  app.get('/user', function(req, res) {
    if(!req.param(userIDName)) {
      return res.send(401, 'userID required!');
    }
    res.send({username: 42});
  });

  app.post('/update', function(req, res) {
    if(!req.param(userIDName)) {
      return res.send(401, 'userID required!');
    }
    username = req.body.username;
    res.send({username: username});
  });
  return app;
};
