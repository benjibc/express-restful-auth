'use strict';
/**
 * Handles the authentication
 * @param {Object} store  express session store object
 * @this
 */
var expressSession = require('express-session');
var Session = expressSession.Session;
var Cookie = expressSession.Cookie;
var RedisStore = require('connect-redis')(expressSession);
var uid = require('uid2');
/**
 * Authentication system
 * @param {Object} options
 * options take in the options for the redis store, maxAge and options for the
 * name of the userID and accessToken.
 */
var Auth = function(options) {
  options = options || {};
  var storeOpt = options.store
                 || {host: '127.0.0.1', port: 6379, db: 2, pass: ''};
  var maxAge = options.maxAge || '86400000'; // an hour
  var tokenName = options.tokenName || 'token',
      userIDName = options.userIDName || 'userID',
      notok = options.notok || Auth.notok,
      unauthed = options.unauthed || Auth.unauthed;

  if (userIDName === 'id') {
    throw new Error("Cannot assign to read only property 'id' of #<Session>");
  }
  
  Auth.store = new RedisStore(storeOpt);
  Auth.maxAge = maxAge;
  Auth.tokenName = tokenName;
  Auth.userIDName = userIDName;
  Auth.notoken = notok;
  Auth.unauthenticated = unauthed;


  // middleware function
  return function(req, res, next) {
    req.sessionStore = Auth.store;
    // intercept the methods if they have token in their request and send them
    // to .get and .post to check for their validity
    if (req.param(tokenName) || req.param(userIDName)) {
      return Auth.auth(req, res, next);
    }

    // load the session, and make sure the session is saved when writes are
    // ended
    req.loadSession = function(req, cb) {
      this.store.get(req.param(tokenName), function(err, session) {
        if(err) {
          return cb(err);
        }
        req.session = session;
        cb(null, session);
      });
    };

    // no token associated with query param or body, then need to generate a
    // token
    req.genSession = function(req) {
      req.sessionID = uid(24);
      req.session = new Session(req);

      //TODO: have proper settings for cookie
      req.session.cookie = new Cookie({maxAge: maxAge});

      // set to store the session when the session ends
      var end = res.end;
      Auth.onEnd(req, res, end);
      return req;
    };
    next();
  };
};


/**
 * Sets the session to be saved on end
 * @param {Object} req
 * @param {Object} res
 * @param {Object} end
 */
Auth.onEnd = function(req, res, end) {
  res.end = function(data, encoding){
    res.end = end;
    if (!req.session) {
      return res.end(data, encoding);
    }
    req.session.resetMaxAge();
    req.session.save(function(err){
      if (err) {
        console.error(err.stack);
      }
      res.end(data, encoding);
    });
  };
};

/**
 * Routing function for all user actions
 * if no token was sent, will send the user to login and see what happens
 * this function should never be called without token present 
 * @param {Object} req  express generic request object
 * @param {Object} res  express generic res object
 * @param {Function} success  callback if authentication succeeded
 * @param {Function} fail     callback if authentication failed
 * @param {Function} notok    callback if no token given by user
 */
Auth.auth = function(req, res, next) {
  // if we have the userID, we can check with the token and proceed
  if (req.param(Auth.tokenName)) {
    Auth.store.get(req.param(Auth.tokenName), function(err, session) {
      if(err) {
        return next(err);
      }
      if (!session || session[Auth.userIDName] !== req.param(Auth.userIDName)) {
        // fail to authenticate because userID does not match token, or the 
        // session has expired
        Auth.unauthenticated(next);
      } else {
        next();
      }
    });
  } else {
    // fail to authenticate because no userID 
    Auth.notoken(next);
  }
};

/**
 * Generic handler for request that is unauthorized
 * @param {Function} next express next function for middleware 
 */
Auth.unauthed = function(next) {
  var err = new Error('Failed to authenticate');
  err.status = 401;
  return next(err);
};

/**
 * Generic handler for request that does not contain complete information 
 * @param {Function} next express next function for middleware 
 */
Auth.notok = function(next) {
  var err = new Error('Does not contain token or userID');
  err.status = 401;
  return next(err);
};

/**
 * Module export
 */
module.exports = Auth;
