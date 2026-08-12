require('dotenv').config();

const checkEnv = require('./src/config/checkEnv');
checkEnv(); // exits the process immediately if anything required is missing

const connectDB = require('./src/config/db');
const app = require('./src/app');

const PORT = process.env.PORT || 5003;

const start = async () => {
  await connectDB(); // DB must be connected before we start accepting requests
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
};

start();
