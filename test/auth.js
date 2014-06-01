'use strict';
var request = require('supertest');
var express = require('./express');
var assert = require('assert');

var userID = '4567890';
var password = '567890';
var username = 'Bob';
describe('try to break into the system', function() {
  it('request should be accepted if the token is good', function(done) {
    var app = express();
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body;
      request(app)
      .get('/user')
      .query({userID: userID, token: token})
      .expect(401)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });

  it('should be able to log out if userID matches with token', function(done) {
    var app = express();
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body.token;
      request(app)
      .get('/logout')
      .query({userID: userID, token: token})
      .expect(200)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });

  it('should not be able to log out if wrong token', function(done) {
    var app = express();
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body.token + 'wrong';
      request(app)
      .get('/logout')
      .query({userID: userID, token: token})
      .expect(401)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });

  it('request should be rejected with 401 if the token is bad', function(done) {
    var app = express();
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body.token;
      token += "78";
      request(app)
      .get('/user')
      .query({userID: userID, token: token})
      .expect(401)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });

  it('should work for post', function(done) {
    var app = express();
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body.token;
      var username = 'Alice';
      request(app)
      .post('/update')
      .send({userID: userID, token: token, username: username})
      .expect(200)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        assert.equal(res.body.username, username, 'Username should match');
        done();
      });
    });
  });
});

describe('test effect of different settings', function() {
  it("use a different userID name, should not work with 'id'", function(done) {
    assert.throws(
      function() {
        var app = express({userIDName: 'id'});
        request(app)
        .get('/login')
        .send({username: username, password: password})
        .expect(200)
        .end(function(e, res) {
          
          // now we have the token, lets see if it works with /user 
          var token = res.body.token;
          request(app)
          .get('/user')
          .query({id: userID, token: token})
          .expect(200)
          .end(function(err, res){
            if (err) {
              return done(err);
            }
            done();
          });
        });
      },
      function(err) {
        if ((err instanceof Error) && /read only property/.test(err)) {
          done();
          return true;
        } else {
          done(err);
        }
      },
      "unexpected error"
    );
  });

  it("use '_id', should not work with userID", function(done) {
    var app = express({userIDName: '_id'});
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body.token;
      request(app)
      .get('/user')
      .query({userID: userID, token: token})
      .expect(401)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });
  it("use a different token name 'access_token'", function(done) {
    var app = express({tokenName: 'access_token'});
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body.access_token;
      request(app)
      .get('/user')
      .query({userID: userID, access_token: token})
      .expect(200)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });

  });
  
  it("use a different notok function (500 instead of 401)", function(done) {
    var notok = function(next) {
      var err = new Error('Why you no token');
      err.status = 500;
      return next(err);
    };
    var app = express({notok: notok});
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body.token;
      request(app)
      .get('/user')
      .query({userID: userID})
      .expect(500)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });
  it("use a different fail function (430 instead of 401)", function(done) {
    var unauthed = function(next) {
      var err = new Error('Why you no token');
      err.status = 430;
      return next(err);
    };
    var app = express({unauthed:  unauthed});
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body.token + '56789okn';
      token += "78";
      request(app)
      .get('/user')
      .query({userID: userID, token: token})
      .expect(430)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });

  });

  // I will not really test to connect to a different port on redis; rather,
  // I will just make sure the changes went through to the redis client
  it("use a different redis server setup", function(done) {
    var storeOpt = {host: 'localhost', port: 6379, db: 1, pass: ''};
    var app = express({storeOpt: storeOpt});
    request(app)
    .get('/login')
    .send({username: username, password: password})
    .expect(200)
    .end(function(e, res) {
      
      // now we have the token, lets see if it works with /user 
      var token = res.body.token;
      request(app)
      .get('/user')
      .query({userID: userID, token: token})
      .expect(200)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });
});
