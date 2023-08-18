import mongoose from 'mongoose';

let userDbConnection = null;
let userConnectionEstablishedPromise = null;

const connectUserDB = () => {
    if (!userConnectionEstablishedPromise) {
        userConnectionEstablishedPromise = new Promise(async (resolve, reject) => {
            try {
                userDbConnection = mongoose.createConnection(process.env.MONGO_DB_USERS, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });
                userDbConnection.once('open', () => {
                    console.log('USERS MongoDB Connected...');
                    resolve(userDbConnection);
                });
                userDbConnection.on('error', (err) => {
                    console.error('Error connecting to USERS MongoDB:', err);
                    reject(err);
                });
            } catch (err) {
                console.error(err.message);
                reject(err);
            }
        });
    }
    return userConnectionEstablishedPromise;
};

const getUserDbConnection = async () => {
    if (!userDbConnection) {
        await connectUserDB();
    }
    return userDbConnection;
};

export { connectUserDB, getUserDbConnection };
