import mongoose from 'mongoose';
import { AdminSchema } from '../utils/Admin'

const connectAdminDB = new Promise((resolve, reject) => {
  const adminDbConnection = mongoose.createConnection(process.env.MONGO_DB_ADMIN, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  adminDbConnection.on('connected', () => {
    console.log('adminDB has successfully connected!');
    const AdminModel = adminDbConnection.model('Admin', AdminSchema);
    resolve(AdminModel);
  });

  adminDbConnection.on('error', (err) => {
    console.error('admindDB Connection error:', err);
    reject(err);
  });
  
});

export { connectAdminDB };


