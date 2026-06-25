const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    console.log(`Database: ${conn.connection.name}`.green);

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err.message}`.red);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected'.yellow);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected'.green);
    });

    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

module.exports = connectDB;