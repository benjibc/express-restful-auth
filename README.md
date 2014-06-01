express-restful-auth -- restful authentication system for express 
==============================

If you want to build a restful server for Node.js, and still want to use express,
but prefer to avoid all the overhead cost for express-session, you have come to
the right place. express-restful-auth is an light-weight RESTful authentication
system based on userID and access token. It will only generation session 
information and store it into redis when you explicitly calls for 

    req.genSession(). 

When either of userID or access token is provided, the system will enforce both
to be present and check if the userID matches with the token. 

## installation

either put the package name, express-restufl-auth, into package.json, or type
the following command: 
    npm install express-restful-auth


## Usage

    var express = require('express');
    var app = express();
    var auth = require('express-restful-auth');

    app.use(express.urlencoded());
    app.use(express.json());
    app.use(auth());

and now you are ready to go! To set the data associated with the token, you
can do the following:

    app.get('/login', function(req, res) {
      if (req.param('password') === password && req.param('username') === username) {
        req.genSession();
        // or, if you are more comfortable, req = req.genSession();

        // now I will associate this userID with the session. String format is 
        // preferred because express sometimes typecast unexpectedly. Note: you
        // have to explicitly assign the userID to the session object 
        req.session.userID = userID.toString();
        res.send({token: req.sessionID, userID: req.session.userID});
      } else {
        res.send(401, "password mismatch!");
      }
    });


for more advanced usage such as changing name of userID, access token, explicity error handler, or changing the redis server configuration, check out the test cases.

