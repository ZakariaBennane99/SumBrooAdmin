import connectUserDB from '../../../utils/connectUserDB';
import User from '../../../utils/customers/User';


export default async function handler(req, res) {

    if (req.method !== 'GET') {
      return res.status(405).end();
    }

    // connectUserDB
    await connectUserDB();

    // @! ATTENTION BELOW
    // YOu need to update the below as the more users you have
    // the worse the performance, you need to bring a max of 10-12 posts
    // and when you click on more, you can get more by hitting the same 
    // route
  
    try {

        const postsInReview = await User.aggregate([
            // Unwind the arrays to denormalize the data
            { $unwind: "$socialMediaLinks" },
            { $unwind: "$socialMediaLinks.posts" },
          
            // Match posts with "in review" status
            { $match: { "socialMediaLinks.posts.postStatus": "in review" } },
          
            // Project only the necessary fields
            {
              $project: {
                userId: "$_id",
                pinTitle: "$socialMediaLinks.posts.content.textualData.pinterest.title",
                publishingDate: "$socialMediaLinks.posts.publishingDate",
                platform: "$socialMediaLinks.posts.platform",
              },
            },
        ]);

        // the postInReview returns an array of objects
        return res.status(200).json({ postsInReview });

    } catch (err) {
        console.error("Error retrieving users:", err);
        return res.status(400).json({ msg: 'No New Users' });
    }

}


/*

// Use MongoDB aggregation to get the desired data
const postsInReview = await User.aggregate([
    // Unwind the arrays to denormalize the data
    { $unwind: "$socialMediaLinks" },
    { $unwind: "$socialMediaLinks.posts" }
    // Match posts with "in review" status
    { $match: { "socialMediaLinks.posts.postStatus": "in review" } }
    // Project only the necessary fields
    {
      $project: {
        postTitle: "$socialMediaLinks.posts.postTitle",
        platform: "$socialMediaLinks.posts.platform",
        publishingDate: "$socialMediaLinks.posts.publishingDate",
        content: "$socialMediaLinks.posts.content",
        targetingNiche: "$socialMediaLinks.posts.targetingNiche",
        targetingTags: "$socialMediaLinks.posts.targetingTags",
        hostUserId: "$socialMediaLinks.posts.hostUserId",
        userName: "$name",
        profileLink: "$socialMediaLinks.profileLink",
      },
    },
]);

*/