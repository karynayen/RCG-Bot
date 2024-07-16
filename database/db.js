require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USERNAME}:`
+ `${process.env.DB_PASSWORD}@${process.env.CLUSTER}.mongodb.net/`
+ `${process.env.DB_NAME}?retryWrites=true&w=majority`;

const mongoose = require('mongoose');



const connect = async () => {
  try {
    mongoose.connect(uri);
    console.log("MongoDB connected")
    return;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  connect,
};