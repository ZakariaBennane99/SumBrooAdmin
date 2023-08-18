import mongoose from 'mongoose';

let adminDbConnection = null;
let connectionEstablishedPromise = null;

const connectAdminDB = () => {
    if (!connectionEstablishedPromise) {
        connectionEstablishedPromise = new Promise(async (resolve, reject) => {
            try {
                adminDbConnection = mongoose.createConnection(process.env.MONGO_DB_ADMIN, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });
                adminDbConnection.once('open', () => {
                    console.log('ADMIN MongoDB Connected...');
                    resolve(adminDbConnection);
                });
                adminDbConnection.on('error', (err) => {
                    console.error('Error connecting to ADMIN MongoDB:', err);
                    reject(err);
                });
            } catch (err) {
                console.error(err.message);
                reject(err);
            }
        });
    }
    return connectionEstablishedPromise;
};

const getAdminDbConnection = async () => {
    if (!adminDbConnection) {
        await connectAdminDB();
    }
    return adminDbConnection;
};

export { connectAdminDB, getAdminDbConnection };
