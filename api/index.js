require('dotenv').config();
const app = require('../app');
const dbConnection = require('../config/database');

let connected = false;
module.exports = async (req, res) => {
  if (!connected) {
    await dbConnection();
    connected = true;
  }
  return app(req, res);
};