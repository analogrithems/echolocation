/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema;
  
/**
 * Pickup Schema
 */

var PickupSchema = new Schema({
  user: { type: String, default: '' },
  pickup: {lat: Number,  lng: Number },
  destination: { type: String, default: '' },
  driver: { type: String, default: '' },
  notes: { type: String, default: '' },
  distance: { type: Number, default: 0 },
  charge: { type: Number, default: 0 },
  createdAt  : {type : Date, default : Date.now}
});

// the below 5 validations only apply if you are signing up traditionally

PickupSchema.path('user').validate(function (user) {
  return user.length
}, 'User cannot be blank');

PickupSchema.path('driver').validate(function (driver) {
  return driver.length
}, 'Driver cannot be blank');

PickupSchema.path('destination').validate(function (destination) {
  return destination.length
}, 'Destination cannot be blank');


mongoose.model('Pickup', PickupSchema)
