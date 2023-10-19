import { connectUserDB } from '../../../utils/connectUserDB';
import { check, validationResult } from 'express-validator';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
import mongoose from 'mongoose';
import _ from 'lodash';
import he from 'he';



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

    // send email
    async function sendNotificationEmail(user, platform, template) {
      // now send an email informing them about the decision
      const messageData = {
        from: 'SumBroo no-reply@sumbroo.com',
        to: user.email,
        subject: 'Your ' + PLATFOTM + ' Post',
        template: 'rejection email',
        't:variables': JSON.stringify({
            rejectionComments: decision,
            name: capitalize(user.name)
        })
      }

      async function sendMessage() {
        try {
          const response = await client.messages.create('sumbroo.com', messageData);
          console.log(response);
          return response;
        } catch (err) {
          console.error("Error sending email:", );
          return res.status(500).json({ error: "Server" });
        }
      }

      // remove the user before sending the email
      await user.remove();
      
      // Send the email
      const re = await sendMessage();
      if (re.status === 200) {
        console.log("Email sent successfully:", result.response);
        return res.status(200).json({ ok: 'success' });
      } else {
          console.error("Error sending email:", result.response);
          return res.status(400).json({ error: err });
      }

      async function sendEmail(user, platform, template) {
        const PLATFOTM = platform.charAt(0).toUpperCase() + platform.slice(1);
        const params = {
            Destination: {
              ToAddresses: [user.email]
            },
            Template: template,
            TemplateData: JSON.stringify({
              subject: 'Your ' + PLATFOTM + ' Post',
              platform: PLATFOTM,
              name: _.startCase(user.name)
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
                status: 'ok',
                response: { success: true, messageId: data.MessageId }
            };
        } catch (err) {
            console.error(err);
            return {
                status: 'notOk',
                response: { error: 'Failed to send the email.' }
            };
        }
      }  

      // Send the email
      sendEmail(user, platform, template).then(result => {
          if (result.status === 'ok') {
              console.log("Email sent successfully:", result.response);
              return true
          } else {
              console.error("Error sending email:", result.response);
              return false
          }
      });

    }
    

    async function uploadVideoFile(vidUrl) {
    
      // Fetch the file from the S3 URL
      const response = await fetch(vidUrl);
      const blob = await response.blob();
    
      // Create FormData object
      const formData = new FormData();
      formData.append('x-amz-date', '20221012T154547Z');
      formData.append('x-amz-signature', '{x-amz-signature}');
      formData.append('x-amz-security-token', '{x-amz-security-token}');
      formData.append('x-amz-algorithm', 'AWS4-HMAC-SHA256');
      formData.append('key', 'uploads/17/4d/be/2:video:704109860400394553:5258848560742447767');
      formData.append('policy', '{policy}');
      formData.append('x-amz-credential', '{x-amz-credential}');
      formData.append('Content-Type', 'multipart/form-data');
      formData.append('file', blob);
    
      // Send the POST request to upload the file
      const uploadUrl = 'https://pinterest-media-upload.s3-accelerate.amazonaws.com/';
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
    
      if (uploadResponse.ok) {
        console.log('File uploaded successfully');
        return true
      } else {
        console.error('Error uploading file:', await uploadResponse.text());
        return null
      }
    }
    
    async function postVideoIntent() {

      const authorization = `Basic ${Buffer.from(`1484362:${process.env.PINTEREST_APP_SECRET}`).toString('base64')}`;

      const url = 'https://api.pinterest.com/v5/media';
      
      const data = {
        media_type: "video"
      };
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': authorization,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        const result = await response.json();
        console.log(result);
        return result
      } catch (error) {
        console.error('Error:', error);
        return null
      }
    }

    async function checkVideoUpload(mediaId) {
      const url = `https://api.pinterest.com/v5/media/${mediaId}`;
      try {
        const response = await fetch(url, {
          method: 'GET',
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(result);
          return result
        } else {
          console.error('Error:', response.status, response.statusText);
          return null
        }
      } catch (error) {
        console.error('Network Error:', error);
        return null
      }
    }

    async function uploadEntireVidContentToPin(token, data) {
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
    
    async function createPinVideo(userId, platform, data, token) {

      // first register your intent
      const intent = await postVideoIntent();

      if (!intent) {
        return null
      }

      // now get the S3 URL, and hit upload
      const videoURL = `https://sumbroo-media-upload.s3.us-east-1.amazonaws.com/${platform}-${userId}`;
      const uploadInfo = await uploadVideoFile(videoURL);

      if (!uploadInfo) {
        return null
      }

      // check if the video has been uploaded
      const uploaded = await checkVideoUpload(uploadInfo.media_id);

      if (!uploaded) {
        return null
      }

      // update the data with the new media_id
      data.media_source.media_id = uploadInfo.media_id;

      const uploadedEntireVideo = await uploadEntireVidContentToPin(token, data);

      if (!uploadedEntireVideo) {
        return null
      }

      // video Pin has been uploaded!
      return true

    }

    // in case the accessToken has expired
    async function refreshTokenForUser(refToken) {

      const authorization = `Basic ${Buffer.from(`1484362:${process.env.PINTEREST_APP_SECRET}`).toString('base64')}`;

      try {
          const response = await axios.post('https://api.pinterest.com/v5/oauth/token', null, {
              headers: {
                  'Authorization': authorization,
                  'Content-Type': 'application/x-www-form-urlencoded'
              },
              params: {
                  grant_type: 'refresh_token',
                  refresh_token: refToken
              }
            });
  
          const data = response.data;
          const now = new Date();
            const currentUTCDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  
          const tokenExpiryDate = new Date(currentUTCDate.getTime() + (data.expires_in * 1000));
            const theNewToken = data.access_token;
  
          return {
            newToken: theNewToken,
            expiryUTCDate: tokenExpiryDate
            }
  
      } catch (error) {
          console.error('Error refreshing Pinterest token:', error.message);
          return {
            isError: true,
          }
      }
    
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
    let UserModel = await connectUserDB;
  
    try {

      const { userId, postId, platform, comment, isReject, selectedBoard } = req.body;

      const user = await UserModel.findOne({ _id: userId })

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
        await UserModel.updateOne(
          { 
            _id: new mongoose.Types.ObjectId(userId), 
            "socialMediaLinks.posts._id": new mongoose.Types.ObjectId(postId)
          },
          { 
            $set: { 
              "socialMediaLinks.$.posts.$[elem].postStatus": "rejected",
              "socialMediaLinks.$.posts.$[elem].comment": comment 
            },
            $unset: { "socialMediaLinks.$.posts.$[elem].content": "" }
          },
          { 
            arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(postId) }]
          }
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

        const emailSent = await sendNotificationEmail(userInfo, platform, 'Post_Rejection_Template');

        console.log('IS EMAIL SENT FROM REJECTION', emailSent)
 

      } else {
        
        // publish the post to Pinterest
        // check the media type first
        const user = await UserModel.findOne(
          { 
            _id: new mongoose.Types.ObjectId(userId), 
            "socialMediaLinks.posts._id": new mongoose.Types.ObjectId(postId) 
          },
          { "socialMediaLinks.posts.$": 1 } // projection to get only the matched post
        );
      
        const userPost = user?.socialMediaLinks[0].posts[0];

        const hostUser = await UserModel.findOne(
          { 
            _id: new mongoose.Types.ObjectId(userPost.hostUserId), 
            "socialMediaLinks.platformName": 'pinterest' // WOULD BE CHANGED WHEN ADDING ANOTHER PLATFORM
          },
          { "socialMediaLinks.$": 1 } // projection to get only the matched socialMediaLink
        );
        
        const hostUserPlatform = hostUser?.socialMediaLinks[0];
    
        // check the accessToken expiration
        const now = new Date();
        const currentUTCDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    
        // check if the accessToken has expired
        if (hostUserPlatform.accesstokenExpirationDate <= currentUTCDate) {
          // go refresh the token
          const { theNewToken, expiryUTCDate } = await refreshTokenForUser(hostUserPlatform.refreshToken);
          // update the DB with the new token
          hostUserPlatform.accessToken = theNewToken;
          hostUserPlatform.accesstokenExpirationDate = expiryUTCDate;
          await UserModel.save();
        }

        // hostUserAccessToken
        const accessToken = hostUserPlatform.accessToken;

        if (userPost && userPost.content.media.mediaType === 'image') {

          // structure the image upload data
          const data = {
            title: userPost.content.textualData.pinterest.title,
            description: userPost.content.textualData.pinterest.description,
            link: he.decode(userPost.content.textualData.pinterest.destinationLink),
            board_id: selectedBoard,
            media_source: {
              source_type: "image_url",
              url: `https://sumbroo-media-upload.s3.us-east-1.amazonaws.com/${platform}-${userId}`
            }
          };

          // call a function to post to Pinterest Image
          const pinUploaded = await createPin(data, accessToken)

          console.log('The PinUpload Results', pinUploaded)


          // here check if uploaded, delete from AWS S3, otherwise return an error
          if (!pinUploaded) {
            return res.status(400).json({ error: pinUploaded });
          } 

        }


        if (userPost && userPost.content.media.mediaType === 'video') {

          // structure the image upload data
          const data = {
            title: userPost.content.textualData.pinterest.title,
            description: userPost.content.textualData.pinterest.description,
            link: he.decode(userPost.content.textualData.pinterest.destinationLink),
            board_id: selectedBoard,
            media_source: {
              source_type: "video_id",
              cover_image_url: `https://sumbroo-media-upload.s3.us-east-1.amazonaws.com/${platform}-${userId}-videoCover`,
              media_id: ""
            }
          };

          // call the function to post to Pinterest Video
          const pinResults = await createPinVideo(userId, platform, data, accessToken);

          if (!pinResults) {
            return res.status(400).json({ error: pinUploaded });
          }

        }


        // send the email
        const emailSent = await sendNotificationEmail(userInfo, platform, 'Post_Approval_Template');


        // update the postStatus to published 
        // remove the content
        await UserModel.updateOne(
          { 
            _id: new mongoose.Types.ObjectId(userId), 
            "socialMediaLinks.posts._id": new mongoose.Types.ObjectId(postId)
          },
          { 
            $set: { "socialMediaLinks.$.posts.$[elem].postStatus": "published" },
            $unset: { "socialMediaLinks.$.posts.$[elem].content": "" }
          },
          { 
            arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(postId) }]
          }
        );

      }
      

    } catch (err) {
      console.error("Error retrieving users:", err);
      return res.status(400).json({ msg: 'No New Users' });
    }

}
