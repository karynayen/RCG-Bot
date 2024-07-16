const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
    permalink: {
      type: String, 
      required: true,
    },
    channel: {
      type: String,
      required: true,
    },
    eventDescription: {
      type: String,
      required: true
    },
    organizerId: {
      type: String, 
      required: true, 
    }, 
    yesAttendeeIds: {
      type: [String], 
      default: [],
    }, 
    noAttendeeIds: {
      type: [String], 
      default: []
    }
  });

  const Event = mongoose.model('Event', eventSchema);

  module.exports = {
    Event
  };