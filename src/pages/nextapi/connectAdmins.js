import { connectAdminDB } from '../../../utils/connectAdminDB';
import jwt from 'jsonwebtoken';


export default async function handler(req, res) {

    if (req.method !== 'POST') {
      return res.status(405).end();
    }

    // connectAdminDB
    let AdminModel = await connectAdminDB;
  
    const { username, password } = req.body;
  
    // Cleansing: Remove any unwanted characters (This is basic cleansing and may need to be expanded)
    const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '');
    const cleanPassword = password; // You might want to avoid altering the password too much, but apply necessary security measures.

    let user = await AdminModel.findOne({  username: cleanUsername });

    if (!user) {
        return res.status(400).json({ error: 'No user found.' });
    }

    if (cleanPassword !== user.password) {
        return res.status(400).json({ error: 'No user found.' });
    }

    // Generate a JWT token
    const token = jwt.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '5h' } 
    );

    res.setHeader('Set-Cookie', `auth=${token}; HttpOnly; Path=/; Max-Age=3600`);
    // If everything is okay, return a success message.
    return res.status(200).json({ adminName: user.name });

}