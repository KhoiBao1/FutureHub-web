// config.js
require('dotenv').config();

module.exports = {
  database: {
    connection: process.env.MONGODB_URI,
    option: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  }
};
