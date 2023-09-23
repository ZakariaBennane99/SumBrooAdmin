// db.js
import mongoose from 'mongoose';
import User from '../utils/customers/User';
import Admin from '../utils/Admin'

const userDbConnection = mongoose.createConnection(process.env.MONGO_DB_USERS, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const adminDbConnection = mongoose.createConnection(process.env.MONGO_DB_ADMIN, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const UserModel = userDbConnection.model('User', User);
const AdminModel = adminDbConnection.model('Admin', Admin);

export { UserModel, AdminModel };
