import connectUserDB from '../../../utils/connectUserDB';
import User from '../../../utils/customers/User';


export default async function handler(req, res) {

    if (req.method !== 'GET') {
      return res.status(405).end();
    }

    // connectUserDB
    await connectUserDB();

    // GET: userName, platforms, date (Which is already formatted) in an array of OBJ
  
    try {
        const users = await User.find(
          { accountStatus: 'new' }, 
          'name applicationDate socialMediaLinks.platformName socialMediaLinks.profileLink' 
          // This second parameter is a space-separated list that defines which fields to select
          // don't forget to add applicationDate just after the name
        );
        
        return res.status(200).json({ users: users });

    } catch (err) {
        console.error("Error retrieving users:", err);
        return res.status(400).json({ msg: 'No New Users' });
    }

}