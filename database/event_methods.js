const eventSchema = require('./event_schema');

const createEvent = async (permalink, channel, eventDescription, organizerId) => {
  const newEvent = new eventSchema.Event({
    permalink: permalink,
    channel: channel,
    eventDescription: eventDescription,
    organizerId: organizerId
  });
  newEvent.save()
    .then(() => console.log('Event created'))
    .catch((err) => console.log(err));
}

const findEvent = async (permalink) => {
  try {
    const event = await eventSchema.Event.find({ permalink: permalink });
    // Return first event we find.
    if (event[0] !== undefined) {
      return event[0];
    }
  } catch (error) {
    console.error(error);
  }
  return false;
};

const updateEventYesAttendees = async (permalink, newYesAttendeeIds) => {
  try {
    const filter = { permalink: permalink };
    const update = { yesAttendeeIds: newYesAttendeeIds };
    await eventSchema.Event.findOneAndUpdate(filter, update);
  } catch (error) {
    console.error(error);
  }
  return false;
}

const updateEventNoAttendees = async (permalink, newNoAttendeeIds) => {
  try {
    const filter = { permalink: permalink };
    const update = { noAttendeeIds: newNoAttendeeIds };
    await eventSchema.Event.findOneAndUpdate(filter, update);
  } catch (error) {
    console.error(error);
  }
  return false;
}

module.exports = {
  createEvent,
  findEvent,
  updateEventYesAttendees,
  updateEventNoAttendees,
};