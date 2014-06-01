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
      req.genSession();
      req.session[userIDName] = userID;
      var result = {};
      result[tokenName] = req.sessionID;
      result[userIDName] = req.session[userIDName];
      res.send(result);
    } else {
      res.send(401, "password mismatch!");
    }
  });

  // endpoint that destroys the token for a user. You can make sure the token
  //
  app.get('/logout', function(req, res) { 
    req.loadSession(function(e, session) {
      console.log('session loaded');
      // previously I loaded the userID data into session. I will now check
      // for userID for logout and the userID in session to make sure they
      // match, and log the user out
      if(session.userID === req.query.userID) {
        req.destroySession(req.query.token, function(e, data) {
          console.log('session destroyed');
          if(e) {
            res.send(400, e);
          } else {
            res.send(200);
          }
        });
      } else {
        res.send(400, 'userID and token mismatch!');
      }
    });
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
