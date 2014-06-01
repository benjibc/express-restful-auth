'use strict';
/**
 * The library is designed to be a framework for people to operate on when 
 * building a RESTful API using Node.js. It handles the authentication
 * problem and saves you time
 */
var expressSession = require('express-session');
var Session = expressSession.Session;
var Cookie = expressSession.Cookie;
var RedisStore = require('connect-redis')(expressSession);
var uid = require('uid2');
var assert = require('assert');
/**
 * Authentication system
 * @param {Object} options
 * options allow the following fields to be set
 * * store: options to be pased to the storage engine. default to redis on
 *          localhost. Check the code for more detail
 * * storeEngine: custom storage engine. Default to RedisStore. The store
 *                obtained from above will simply be passed directly into
 *                the storeEngine constructor. 
 * * maxAge: maxAge for the cookie. Needs to be a number.
 */
var Auth = function(options) {
  options = options || {};
  var storeOpt = options.store
                 || {host: '127.0.0.1', port: 6379, db: 2, pass: ''};
  var StoreEngine = options.storeEngine || RedisStore;
  var maxAge = options.maxAge || 86400000; // an hour
  var tokenName = options.tokenName || 'token',
      userIDName = options.userIDName || 'userID',
      notok = options.notok || Auth.notok,
      unauthed = options.unauthed || Auth.unauthed;

  // check for the parameters before we proceed to make sure there are no
  // surprises later on. Will not check for the type of storeOpt, since we 
  // don't know what will be passed in the constructor of StoreEngine 
  assert.equal(
    typeof StoreEngine,
    'function',
    'StoreEnegine needs to be a constructor!'
  );
  assert.equal(typeof maxAge, 'number', 'maxAge needs to be a number!');
  assert.equal(typeof tokenName, 'string', 'tokenName needs to be a string!');
  assert.equal(typeof userIDName, 'string', 'userIDName needs to be a string!');
  assert.equal(typeof notok, 'function', 'notok needs to be a function!');
  assert.equal(typeof unauthed, 'function', 'unauthed needs to be a function!');

  if (userIDName === 'id') {
    throw new Error("Cannot assign to read only property 'id' of #<Session>");
  }
  
  Auth.store = new StoreEngine(storeOpt);
  Auth.maxAge = maxAge;
  Auth.tokenName = tokenName;
  Auth.userIDName = userIDName;
  Auth.notoken = notok;
  Auth.unauthenticated = unauthed;


  // middleware function
  return function(req, res, next) {

    req.sessionStore = Auth.store;

    /**
     * Load the session, and make sure the session is saved when writes are
     * ended
     * @param {IncomingRequest} req
     * @param {Function} cb 
     * @api public 
     */
    req.loadSession = function(cb) {
      Auth.store.get(req.param(tokenName), function(err, session) {
        if(err) {
          return cb(err);
        }
        req.session = session;
        console.log('got session');
        cb(null, session);
      });
    };

    /**
     * Function used to generate session and set the field of req.session
     * to the session generated, as well as req.sessionID to be the ID
     * of the session.  
     * @param {IncomingRequest} req
     * @api public 
     */
    req.genSession = function() {
      req.sessionID = uid(24);
      req.session = new Session(req);

      //TODO: have proper settings for cookie
      req.session.cookie = new Cookie({maxAge: Auth.maxAge});

      // set to store the session when the session ends
      var end = res.end;
      Auth.onEnd(req, res, end);
      return req;
    };

    /**
     * Helper function to destroy the current session. The session object
     * will be removed from the database
     * @param {String} token
     * @param {Function} cb
     * @api public
     */
    req.destroySession = function(token, cb) {
      console.log('destroying session', token);
      Auth.store.destroy(token, cb);
    };

    // intercept the methods if they have token in their request and send them
    // to .get and .post to check for their validity
    if (req.param(tokenName) || req.param(userIDName)) {
      return Auth.auth(req, res, next);
    }

    next();
  };
};



/**
 * Sets the session to be saved on end
 * @param {Object} req
 * @param {Object} res
 * @param {Object} end
 * @api private
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
