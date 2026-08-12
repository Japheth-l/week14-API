const mongoose = require('mongoose');

// Some local networks fail to resolve mongodb+srv:// records
// (querySrv ECONNREFUSED). If that happens:
//   1. Switch MONGO_URI in .env to the non-SRV connection string
//      (Atlas > Connect > Drivers > toggle off "srv").
//   2. Keep family: 4 below to force IPv4, since the SRV/DNS failure
//      is usually IPv6-related on these networks.
//   3. As a last resort, try a mobile hotspot instead of the current network.
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
    });
    console.log('DB connected successfully');
  } catch (err) {
    console.error('DB connection failed');
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
