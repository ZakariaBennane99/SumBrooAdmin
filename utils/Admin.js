import { Schema, model } from "mongoose";

const AdminSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
});


let Admin;
try {
    Admin = model('Admin');
} catch {
    Admin = model('Admin', AdminSchema);
}

export default Admin;
