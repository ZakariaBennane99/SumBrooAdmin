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
    
    // Find validation errors
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({ errors: result.array() });
    }

    // connectUserDB
    await connectUserDB();
  
    try {

      const { userId, platform } = req.body;

      const postInReview = await User.aggregate([
        // Match the specific user by ID and the specific platform
        { 
          $match: { 
            _id: new mongoose.Types.ObjectId(userId),
          } 
        },
        
        // Unwind the arrays to denormalize the data
        { $unwind: "$socialMediaLinks" },
        { $unwind: "$socialMediaLinks.posts" },
        
        // Match posts with "in review" status and the specific platform
        { 
          $match: { 
            $and: [
              { "socialMediaLinks.posts.postStatus": "in review" },
              { "socialMediaLinks.posts.platform": platform }, 
            ]
          } 
        },
        
        // Project only the necessary fields
        {
          $project: {
            postId: "$socialMediaLinks.posts._id",
            pinTitle: "$socialMediaLinks.posts.postTitle",
            publishingDate: "$socialMediaLinks.posts.publishingDate",
            content: "$socialMediaLinks.posts.content",
            targetingNiche: "$socialMediaLinks.posts.targetingNiche",
            targetingTags: "$socialMediaLinks.posts.targetingTags",
            hostUserId: "$socialMediaLinks.posts.hostUserId",
            userName: "$name",
            profileLink: "$socialMediaLinks.profileLink",
            userId: userId,
            platform: platform
          },
        },
      ]);

      // the postInReview returns an array of objects
      return res.status(200).json({ post: postInReview[0] });

    } catch (err) {
      console.error("Error retrieving users:", err);
      return res.status(400).json({ msg: 'No New Users' });
    }

}
