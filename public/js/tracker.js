var ecoTracker = {};

ecoTracker.init = function(){
  ecoTracker.map.setupSockets();
};

ecoTracker.disable = function(){
  ecoTracker.map.socket.emit('disableStatus',{});//send request through socket
};  
/**
 * Setup Tracker
 */

//Define User points on map
var userPoints = function(data){
  var self = this;
  self._id = data._id;
  self.username = data.username;
  self.role = data.role;
  self.lat = data.location.lat;
  self.lng = data.location.lng;
  self.status = data.status;
  
  
  if(self._id == u._id || self.role == 'driver'){
    self.ecoLoc = new google.maps.LatLng(self.lat, self.lng);
    self.marker = new google.maps.Marker({
          position: self.ecoLoc,
          map: map,
          icon: 'img/' + self.role + '.png'
    });
      
    self.update = function(){
      if(self.status == 'not_available'){
        self.marker.setMap(null);
      }else{
        var latlng = new google.maps.LatLng(self.lat,self.lng);
        self.marker.setPosition(latlng); 
        self.marker.setMap(map);
      }
    };
    
    self.selectCab = function(){
      google.maps.event.addListener(marker, 'click', function() {
        window.location.hash = '#/pickup/' + self._id;
      });
    };
    
    self.cleanup = function(){
      self.marker.setMap(null);
      console.log("Removing Cab");
    };
  }else{
    self.ecoLoc = null;
    self.marker = null;
    self.update = function(){};
  }

  return self;
}

ecoTracker.pickupRequest = {
  destination: '',
  phone: '',
  notes: '',
  driver: 0,
  user: u._id,
  requestPickup: function(){
    ecoTracker.pickupRequest.destination = document.getElementById("destination").value;
    ecoTracker.pickupRequest.phone = document.getElementById("phone").value;
    ecoTracker.pickupRequest.notes = document.getElementById("notes").value;

    var request = {
      destination: ecoTracker.pickupRequest.destination,
      user: ecoTracker.pickupRequest.user,
      phone: ecoTracker.pickupRequest.phone,
      notes: ecoTracker.pickupRequest.notes,
      driver: ecoTracker.pickupRequest.driver
    };
    ecoTracker.map.socket.emit('requestPickup',request);//send request through socket
    ecoTracker.map.socket.on('acceptPickup',function(data){
      //TODO inform user that the driver has accepted their request and is on the way
      console.log(data);
      if(window.plugins && window.plugins.pushNotification){
        //send push notification
      }else{
        alert("Accepted Pickup");
      }
    });
  },
  promptPickup: function(pickup){
      //TODO inform user that the driver has accepted their request and is on the way
      console.log(pickup);
      if(window.plugins && window.plugins.pushNotification){
        //send push notification
      }else{
        alert("Accepted Pickup");
      }
  },
  driverArrived: function(){
    //notify user driver has arrived
  }
};

ecoTracker.map = function(){
  var self = {};
//  self.socket = io.connect(s, {query: 'session_id=' + readCookie('connect.sid')});
  self.socket = io.connect(s);
  self.myLocation = {};
  self.userLocations = [];
  
  self.setupSockets = function(){
    self.socket.on('locations', function (data) {    
      for(var ni = 0; ni < data.length; ni++){
        console.log("Location: ",data[ni]);
        var f = false;
        for(var i = 0;i<self.userLocations.length;i++){
          if(data[ni]._id == self.userLocations[i]._id){
            self.userLocations[i].lat = data[ni].lat;
            self.userLocations[i].lng = data[ni].lng;
            self.userLocations[i].update();
          }
        }
        if(false == f){
          self.userLocations.push(new userPoints(data[ni]));
        }
      }
      
      if ("geolocation" in navigator) {
        /* geolocation is available */
        updateLocation = navigator.geolocation.watchPosition(
          function(position){
            if( typeof(self.myLocation.lat) == 'undefined' || 
                self.myLocation.lat != position.coords.latitude || 
                typeof(self.myLocation.lng) == 'undefined' || 
                self.myLocation.lng != position.coords.longitude ){
              self.myLocation.lat = position.coords.latitude;
              self.myLocation.lng = position.coords.longitude;
              self.socket.emit('updateLocation', { lat: position.coords.latitude, lng: position.coords.longitude });            
            }
  
          }
          , function(error) {
            alert('ERROR(' + error.code + '): ' + error.message);
          }
        );
      } else {
        /* geolocation IS NOT available */
        alert("Sorry Geo Location not available on your device")
      }
    });
    
    self.socket.on('remove',function(data){
      console.log("Removing taxi from map");
      for(var i = 0;i<self.userLocations.length;i++){
        if(data._id == self.userLocations[i]._id){
          self.userLocations[i].cleanup();
          self.userLocations.splice(i, 1);
        }
      }
    });
    
    self.socket.on('requestPickup',function(req){
      ecoTracker.pickupRequest.promptPickup(req);
    });
  };

  return self;  
};

Path.map("#/map").to(function(){
  $("#tracker").show();
  ecoTracker.pickupRequest.driver = 0;
}).exit(function(){
  $("#tracker").hide();
});
Path.map("#/pickup/:driver").to(function(){
  ecoTracker.pickupRequest.driver = this.params["driver"];
  $("#request-pickup").show();
}).exit(function(){
  $("#request-pickup").hide();
});

Path.root("#/map");

$(document).ready(function () {

  //Setup Google Maps
  var roadAtlasStyles = [
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [
        { hue: '#ff0022' },
        { saturation: 60 },
        { lightness: -20 }
      ]
    },{
      featureType: 'road.arterial',
      elementType: 'all',
      stylers: [
        { hue: '#2200ff' },
        { lightness: -40 },
        { visibility: 'simplified' },
        { saturation: 30 }
      ]
    },{
      featureType: 'road.local',
      elementType: 'all',
      stylers: [
        { hue: '#f6ff00' },
        { saturation: 50 },
        { gamma: 0.7 },
        { visibility: 'simplified' }
      ]
    },{
      featureType: 'water',
      elementType: 'geometry',
      stylers: [
        { saturation: 40 },
        { lightness: 40 }
      ]
    },{
      featureType: 'road.highway',
      elementType: 'labels',
      stylers: [
        { visibility: 'on' },
        { saturation: 98 }
      ]
    },{
      featureType: 'administrative.locality',
      elementType: 'labels',
      stylers: [
        { hue: '#0022ff' },
        { saturation: 50 },
        { lightness: -10 },
        { gamma: 0.90 }
      ]
    },{
      featureType: 'transit.line',
      elementType: 'geometry',
      stylers: [
        { hue: '#ff0000' },
        { visibility: 'on' },
        { lightness: -70 }
      ]
    }
  ];

  var mapOptions = {
    zoom: 13,
    center: new google.maps.LatLng(21.300595, -157.841982),
    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'usroadatlas']
    },
    disableDefaultUI: true
  };
  
  map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);

  var styledMapOptions = {
    name: 'US Road Atlas'
  };

  var usRoadMapType = new google.maps.StyledMapType(
      roadAtlasStyles, styledMapOptions);

  map.mapTypes.set('usroadatlas', usRoadMapType);
  map.setMapTypeId('usroadatlas');
  Path.listen();  
  ecoTracker.map().setupSockets();
});
  
(function(){
    var cookies;

    function readCookie(name,c,C,i){
        if(cookies){ return cookies[name]; }

        c = document.cookie.split('; ');
        cookies = {};

        for(i=c.length-1; i>=0; i--){
           C = c[i].split('=');
           cookies[C[0]] = C[1];
        }
        return cookies[name];
    }

    window.readCookie = readCookie; // or expose it however you want
})();

