const mongoose = require("mongoose");
const User = require("../models/userModel");

mongoose.set("strictQuery", true);

const DEFAULT_ADMIN = {
  name: "Hossam",
  slug: "hossam",
  email: "hossam@gmail.com",
  password: "hossam012@",
  role: "admin",
  phone: "01000000000",
  active: true,
};

const ensureDefaultAdmin = async () => {
  try {
    const normalizedEmail = DEFAULT_ADMIN.email.toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: normalizedEmail });

    if (!existingAdmin) {
      await User.create(DEFAULT_ADMIN);
      console.log(`Default admin account (${DEFAULT_ADMIN.email}) created successfully.`);
    }
  } catch (error) {
    if (error.code === 11000) return;
    console.error(`Error ensuring default admin: ${error.message}`);
  }
};

const dbConnection = () => {
  const dbUri = process.env.MONGO_URI || process.env.DB_URI;

  if (!dbUri) {
    throw new Error("Neither MONGO_URI nor DB_URI is defined in environment.");
  }

  return mongoose
    .connect(dbUri)
    .then(async () => {
      console.log(`Database Connected`);
      await ensureDefaultAdmin();
    })
    .catch((err) => {
      console.error(`Database Error: ${err}`);
      throw err;
    });
};

module.exports = dbConnection;