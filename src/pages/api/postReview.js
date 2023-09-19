import connectUserDB from '../../../utils/connectUserDB';
import User from '../../../utils/customers/User';
import { check, validationResult } from 'express-validator';
import mongoose from 'mongoose';



export default async function handler(req, res) {

    if (req.method !== 'POST') {
      return res.status(405).end();
    }

    // check the data
    await check('userId').isString().run(req);
    await check('platform').isString().run(req);
    await check('isReject').toBoolean().isBoolean().run(req);
    await check('comment').isString().run(req);
    
    // Find validation errors
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({ errors: result.array() });
    }

    // connectUserDB
    await connectUserDB();
  
    try {

      const { userId, platform, comment, isReject } = req.body;

      // now if success send a success email with a link 
      // to their live post, and update the status of the post 
      // to accept 
      if (isReject) {
        // send an email with a desc with the comment, 
        // and prompt them to create a new post
        // and update the post to reject, and add the comment
      } else {
        // send an email with a link to their live post
        // and update the post to accept
      }
      

      // the postInReview returns an array of objects
      return res.status(200).json({ post: 'Yeah' });

    } catch (err) {
      console.error("Error retrieving users:", err);
      return res.status(400).json({ msg: 'No New Users' });
    }

}
