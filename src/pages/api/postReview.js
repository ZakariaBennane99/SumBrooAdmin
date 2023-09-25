import connectUserDB from '../../../utils/connectUserDB';
import User from '../../../utils/customers/User';
import { check, validationResult } from 'express-validator';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
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

    async function createPin(data, token) {
      try {
        const response = await fetch('https://api.pinterest.com/v5/pins', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
    
        const result = await response.json();
        console.log(result);
        return result

      } catch (error) {
        console.error('Error:', error);
        return null
      }
    }

    // connectUserDB
    await connectUserDB();
  
    try {

      const { userId, postId, platform, comment, isReject, selectedBoard } = req.body;

      const user = await User.findOne({ _id: userId })

      const userInfo = {
        userName: user.name,
        email: user.email
      }

      // the platform will be needed later on if we have multiple platforms

      if (isReject) {

        // send an email with a desc with the comment, 
        // and prompt them to create a new post
        // and update the post to reject, and add the comment

        // Update post status updated and remove content
        await User.updateOne(
          { "socialMediaLinks.posts._id": new mongoose.Types.ObjectId(postId) },
          { 
            $set: { "socialMediaLinks.$.posts.$[elem].postStatus": "rejected" },
            $set: { "socialMediaLinks.$.posts.$[elem].comment": comment },
            $unset: { "socialMediaLinks.$.posts.$[elem].content": "" }
          },
          { arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(postId) }] }
        );

        // delete the media from AWS S3
        const FILE_KEY = 'pinterest-' + userId;

        // Initialize the S3 Client
        const s3Client = new S3Client({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          },
        });

        // Create a new instance of the DeleteObjectCommand
        const command = new DeleteObjectCommand({
          Bucket: 'sumbroo-media-upload',
          Key: FILE_KEY,
        });

        try {
          // Try to send the command to delete the object
          await s3Client.send(command);
          console.log(`File with KEY: ${FILE_KEY} deleted successfully`);
        } catch (error) {
          // Catch any error that occurs
          console.error("Error deleting file:", error);
          return res.status(500).json({ msg: 'Error deleting the media from AWS S3.' });
        }

        // now send an email informing them about the decision

        async function sendEmail(user, platform) {
          
          const PLATFOTM = platform.charAt(0).toUpperCase() + platform.slice(1);

          const params = {
              Destination: {
                ToAddresses: [user.email]
              },
              Template: 'Post_Rejection_Template',
              TemplateData: JSON.stringify({
                subject: 'Your ' + PLATFOTM + ' Post',
                platform: PLATFOTM,
                name: capitalize(user.name)
              }),
              Source: 'no-reply@sumbroo.com'
          };
      
          const command = new SendTemplatedEmailCommand(params);

          
          const sesClient = new SESClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
          });
      
          try {
              const data = await sesClient.send(command);
              return {
                  status: 200,
                  response: { success: true, messageId: data.MessageId }
              };
          } catch (err) {
              console.error(err);
              return {
                  status: 500,
                  response: { error: 'Failed to send the email.' }
              };
          }
        }

        // Send the email
        sendEmail(userInfo, platform).then(result => {
            if (result.status === 200) {
                console.log("Email sent successfully:", result.response);
                return res.status(200).json({ ok: 'success' });
            } else {
                console.error("Error sending email:", result.response);
                return res.status(500).json({ error: err });
            }
        });   

      } else {
        
        // publish the post to Pinterest
        // check the media type first
        const user = await User.findOne(
          { 
            _id: new mongoose.Types.ObjectId(userId), 
            "socialMediaLinks.posts._id": new mongoose.Types.ObjectId(postId) 
          },
          { "socialMediaLinks.posts.$": 1 } // projection to get only the matched post
        );
        
        const post = user?.socialMediaLinks.posts[0];

        if (post && post.content.media.mediaType === 'image') {

          // structure the data
          const data = {
            title: "My Pin",
            description: "Pin Description",
            board_id: boardId,
            media_source: {
              source_type: "image_url",
              url: "https://i.pinimg.com/564x/28/75/e9/2875e94f8055227e72d514b837adb271.jpg"
            }
          };

          // call a function to post to Pinterest Image
          const isUploaded = await createPin()

        }

        if (post && post.content.media.mediaType === 'video') {
          // call the function to post to Pinterest Video
        }


        // update the postStatus to published 
        // remove the content
        await User.updateOne(
          { "socialMediaLinks.posts._id": new mongoose.Types.ObjectId(postId) },
          { 
            $set: { "socialMediaLinks.$.posts.$[elem].postStatus": "published" },
            $unset: { "socialMediaLinks.$.posts.$[elem].content": "" }
          },
          { arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(postId) }] }
        );



        // delete the media from AWS S3
        const FILE_KEY = 'pinterest-' + user
        // Initialize the S3 Client
        const s3Client = new S3Client({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          },
        });

        // Create a new instance of the DeleteObjectCommand
        const command = new DeleteObjectCommand({
          Bucket: 'sumbroo-media-upload',
          Key: FILE_KEY,
        });

        try {
          // Try to send the command to delete the object
          await s3Client.send(command);
          console.log(`File with KEY: ${FILE_KEY} deleted successfully`);
        } catch (error) {
          // Catch any error that occurs
          console.error("Error deleting file:", error);
          return res.status(500).json({ msg: 'Error deleting the media from AWS S3.' });
        }
        

      }
      

      // the postInReview returns an array of objects
      return res.status(200).json({ post: 'Yeah' });

    } catch (err) {
      console.error("Error retrieving users:", err);
      return res.status(400).json({ msg: 'No New Users' });
    }

}
