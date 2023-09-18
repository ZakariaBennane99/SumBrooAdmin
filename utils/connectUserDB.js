import mongoose from 'mongoose';

const connectUserDB = async () => {

  try {

    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB is already connected');
      return;
    }

    await mongoose.connect(process.env.MONGO_DB_USERS, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
  
};

module.exports = connectUserDB;
