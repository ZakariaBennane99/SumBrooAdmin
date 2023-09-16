import { connect } from 'mongoose';

const connectAdminDB = async () => {
    try {
      await connect(process.env.MONGO_DB_ADMIN)
      console.log('MongoDB Admin Connected...')
    } catch (err) {
      console.error(err.message)
      // Exit process with failure
      process.exit(1)
    }
}

module.exports = connectAdminDB;

