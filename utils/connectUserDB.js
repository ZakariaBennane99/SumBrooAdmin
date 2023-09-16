import { connect } from 'mongoose';

const connectUserDB = async () => {
    try {
      await connect(process.env.MONGO_DB_USERS)
      console.log('MongoDB Connected...')
    } catch (err) {
      console.error(err.message)
      // Exit process with failure
      process.exit(1)
    }
}

module.exports = connectUserDB;
