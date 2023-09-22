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

    // connectUserDB
    await connectUserDB();
  
    try {

      const { userId, postId, platform, comment, isReject } = req.body;

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

        // get the board belonging to the host user


        // then you have to call the corresponding function
        // the boards should already be in the admin page, then 
        // he/she can choose the right board based off the content
        if () {
           
        } else {

        }




        // update the postStatus and remove the content
        // don't forget to remove the comment
        await User.updateOne(
          { "socialMediaLinks.posts._id": new mongoose.Types.ObjectId(postId) },
          { 
            $set: { "socialMediaLinks.$.posts.$[elem].postStatus": "published" },
            $set: { "socialMediaLinks.$.posts.$[elem].comment": comment },
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
