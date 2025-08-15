require('dotenv').config();

module.exports = {
  database: {
    connection: process.env.MONGODB_URI,
    option: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  session: {
    key: process.env.SESSION_SECRET || 'mySecretKey'
  }
};
