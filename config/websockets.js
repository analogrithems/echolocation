/**
 * Module dependencies.
 */

var auth = require('./middlewares/authorization')
  , users = require('../app/controllers/users')
  , pkg = require('../package.json')
  
  
var env = process.env.NODE_ENV || 'development'

module.exports = function (io, passport) {

  //Setup Websocket
  var userLocations = [];
  io.sockets.on('connection', function (socket) {

    socket.emit('locations', userLocations);
    socket.on('updateLocation', function (data) {
      console.log(data);
      userLocations.push(data);
      socket.emit('locations', userLocations);
      //update userLocations
    });
  });
  
};