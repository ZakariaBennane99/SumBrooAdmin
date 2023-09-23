import mongoose from 'mongoose';
import { UserSchema } from '../utils/customers/User'

const connectUserDB = new Promise((resolve, reject) => {
  // Check if a connection to the userDB already exists
  const existingConnection = mongoose.connections.find(connection => 
    connection.name === process.env.MONGO_DB_USERS
  );

  if (existingConnection && existingConnection.readyState === 1) {
    console.log('userDB is already connected!');
    const UserModel = existingConnection.model('User', UserSchema);
    return resolve(UserModel);
  }

  // If no existing connection, create a new one
  const userDbConnection = mongoose.createConnection(process.env.MONGO_DB_USERS, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  userDbConnection.on('connected', () => {
    console.log('userDB has successfully connected!');
    const UserModel = userDbConnection.model('User', UserSchema);
    resolve(UserModel);
  });

  userDbConnection.on('error', (err) => {
    console.error('userDB Connection error:', err);
    reject(err);
  });
});

export { connectUserDB };

