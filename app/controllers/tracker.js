/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , express = require('express')
  , mongoStore = require('connect-mongo')(express)
  , User = mongoose.model('User')
  , utils = require('../../lib/utils')
  , pkg = require('../../package.json')
  , passportSocketIo = require("passport.socketio");


function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io');

  // The accept-callback still allows us to decide whether to
  // accept the connection or not.
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept){
  if(error)
    throw new Error(message);
  console.log('failed connection to socket.io:', message);

  // We use this callback to log all of our failed connections.
  accept(null, false);
}

/**
 * List
 */

exports.index = function(req, res){

  /**
   * Here is how the tracker works,
   * first we create a list of user locations
   * this will include basic user info, (_id, username, role, location: {lat, lng}}
   * whenever the users location changes it emits an updateLocation notice
   * we then update our internal userLocations array. We then emit
   * a filtered version of the userLocations list that contains
   * each of the cab drivers location + the current users location
   *
   * When a user disconnects from the tunnel their entry in userLocations gets
   * removed.  We then send the update list out to everyone to update their maps
   */
  var userLocations = [];
  var user = req.user;
  var env = process.env.NODE_ENV || 'development'
    , config = require('../../config/config')[env]
  var sessionStore = new mongoStore({
    url: config.db,
    collection : 'sessions'
  });
  req.io.set('authorization', passportSocketIo.authorize({
    cookieParser: express.cookieParser,
    key:         'connect.sid',       // the name of the cookie where express/connect stores its session_id
    secret:      pkg.name,    // the session_secret to parse the cookie
    store:       sessionStore,        // we NEED to use a sessionstore. no memorystore please
    success:     onAuthorizeSuccess,  // *optional* callback on success - read more below
    fail:        onAuthorizeFail,     // *optional* callback on fail/error - read more below
  }));
  
  req.io.sockets.on('connection', function (socket) {
    //send filtered list
    socket.emit('locations', filterLocations(userLocations,user));

    socket.on('updateLocation', function (data) {      
      var inList = false;
      for(var i = 0;i<userLocations.length;i++){
        if(userLocations[i]._id == user._id){
          inList = true;
          userLocations[i] = { 
              _id: user._id
            , username: user.username
            , role: user.role
            , status: 'available'
            , location: data
          };
        }
      }
      if( false == inList ){
        userLocations.push({ 
            _id: user._id
          , username: user.username
          , role: user.role
          , status: 'available'
          , location: data
        });
      }
      
      //send the updates
      socket.emit('locations', filterLocations(userLocations,user));
    });


    socket.on('enableStatus', function(data){
      for(var i = 0;i<userLocations.length;i++){
        if(userLocations[i]._id = user._id){
          userLocations[i].status = 'available';
        }
      }
      socket.emit('locations', filterLocations(userLocations,user));
    });

    socket.on('disableStatus', function(data){
      for(var i = 0;i<userLocations.length;i++){
        if(userLocations[i]._id = user._id){
          userLocations[i].status = 'not_available';
        }
      }
      socket.emit('locations', filterLocations(userLocations,user));
    });
    
    //disconnect event remove them from the map
    socket.on('disconnect', function () {
      for(var i = 0;i<userLocations.length;i++){
        if(userLocations[i]._id = user._id){
          var rm = userLocations.splice(i,1);
          socket.emit('remove', rm);
          socket.emit('locations', filterLocations(userLocations,user));
        }
      }
    });

  });
  

  res.render('tracker/map', {
    title: 'Echolocation',
    user: user,
    message: req.flash('error')
  });
};

filterLocations = function(ulocs, user){
 console.log("User Locs:",ulocs);
  var filterUserLocations = [];
  for(var no = 0; no < ulocs.length; no++){
    //do not emit locations of other customers
    console.log("Current User:",user,"\n Current Locs:",ulocs[no]);
    if(ulocs[no].role == 'driver' || ulocs[no]._id == user._id){
      if(ulocs[no].status == 'available' ){
        console.log("Users Match:", user);
        filterUserLocations.push(ulocs[no]);
      }
    }
  }
   
  return filterUserLocations;
};

