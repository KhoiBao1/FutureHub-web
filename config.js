require('dotenv').config();

module.exports = {
  app: {
    port: process.env.PORT || 3000
  },
  database: {
    connection: process.env.MONGODB_CONNECT_URI,
    option: {
      autoIndex: false
    }
  },
  session: {
    key: '27bda112-99dd-4496-8015-ea20d1034228'
  }
};
