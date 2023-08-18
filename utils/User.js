import { Schema } from "mongoose";
import { getAdminDbConnection } from "./connectAdminDB";

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


const adminDbConnection = await getAdminDbConnection();
const AdminModel = adminDbConnection.model("Admin", AdminSchema);

export default AdminModel;
