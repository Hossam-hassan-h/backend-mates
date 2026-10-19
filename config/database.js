const mongoose = require("mongoose");
const User = require("../models/userModel");

mongoose.set("strictQuery", true);



const dbConnection = () => {
  const dbUri = process.env.MONGO_URI || process.env.DB_URI;

  if (!dbUri) {
    throw new Error("Neither MONGO_URI nor DB_URI is defined in environment.");
  }

  return mongoose
    .connect(dbUri)
    .then(async () => {
      console.log(`Database Connected`);
    })
    .catch((err) => {
      console.error(`Database Error: ${err}`);
      throw err;
    });
};

module.exports = dbConnection;