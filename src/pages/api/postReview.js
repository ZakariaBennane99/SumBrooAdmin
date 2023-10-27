import { connectUserDB } from '../../../utils/connectUserDB';
import { check, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import _ from 'lodash';
import he from 'he';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import axios from 'axios';
import { fileTypeFromStream } from 'file-type';


function capitalize(str) {
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}


// set up MailGun

const mailgun = new Mailgun(FormData);

const client = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY });


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
    async function sendNotificationEmail(user, platform, template, publishedLink) {
      console.log('The template and the publishedLink', template, publishedLink)
      // now send an email informing them about the decision
      const PLATFOTM = platform.charAt(0).toUpperCase() + platform.slice(1);
      const messageData = {
        from: 'SumBroo no-reply@sumbroo.com',
        to: user.email,
        subject: 'Your ' + PLATFOTM + ' Post',
        template: template,
        't:variables': JSON.stringify({
            name: capitalize(user.userName),
            platform: PLATFOTM,
            publishedLink: publishedLink
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
      
      // Send the email
      const re = await sendMessage();
      if (re.status === 200) {
        console.log("Email sent successfully:", re.response);
        return true;
      } else {
          console.error("Error sending email:", re.response);
          return false
      }


    }


    function getFileKey(url) {
      const match = url.match(/pinterest-[^/]+/);
      return match ? match[0] : null;
    }
    
    async function uploadVideoFile(vidUrl, intent, upload_url) {

      // Fetch the file from the S3 URL
      const response = await axios.get(vidUrl, { responseType: 'stream' });

      const FILE_DATA = response.data; 

      const FILE_EXTENSION = await fileTypeFromStream(FILE_DATA);

      console.log('The FILE EXTENSION', FILE_EXTENSION)

      // the file name without extension
      const fileKey = getFileKey(vidUrl);

      const fileName = `${fileKey}.${FILE_EXTENSION.ext}`;

      const boundary = "--------------------------" + Math.random().toString(36).slice(2);
    
      let data = '';
    
      // Append 'key' field first
      if (intent.key) {
        data += `--${boundary}\r\n`;
        data += `Content-Disposition: form-data; name="key"\r\n\r\n`;
        data += intent.key + '\r\n';
      }
    
      // Append other fields
      for (let key in intent) {
        if (key !== 'upload_url' && key !== 'key') {
          data += `--${boundary}\r\n`;
          data += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
          data += intent[key] + '\r\n';
        }
      }
    
      // Append file
      data += `--${boundary}\r\n`;
      data += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
      data += 'Content-Type: application/octet-stream\r\n\r\n';
      data += FILE_DATA + '\r\n';
    
      data += `--${boundary}--\r\n`;

    
      // Send the POST request to upload the file
      const uploadResponse = await fetch(upload_url, {
        method: 'POST',
        body: data,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        }
      });

      console.log('the upload section to AWS', uploadResponse)
    
      if (uploadResponse.ok) {
        console.log('File uploaded successfully');
        return true
      } else {
        console.error('Error uploading file:', await uploadResponse.text());
        return null
      }
    }
    
    async function postVideoIntent(token) {

      // const authorization = `Basic ${Buffer.from(`1484362:${process.env.PINTEREST_APP_SECRET}`).toString('base64')}`;

      const url = 'https://api.pinterest.com/v5/media';
      
      const data = {
        media_type: "video"
      };
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        console.log('The Post results from the postVideoIntent', result);
        return result
      } catch (error) {
        console.error('Error:', error);
        return null
      }
    }

    async function checkVideoUpload(mediaId, token) {
      const url = `https://api.pinterest.com/v5/media/${mediaId}`;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
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
        console.log('The results from the uploadEntireVideoContentPin', result);
        return result

      } catch (error) {
        console.error('Error:', error);
        return null
      }
    }
    
    async function createPinVideo(userId, platform, data, token) {

      // first register your intent
      const intent = await postVideoIntent(token);

      if (!intent) {
        return null
      }

      // now get the S3 URL, and hit upload
      const videoURL = `https://sumbroo-media-upload.s3.us-east-1.amazonaws.com/${platform}-${userId}`;
      const uploadInfo = await uploadVideoFile(videoURL, intent.upload_parameters, intent.upload_url);

      // check if the video has been uploaded
      const uploaded = await checkVideoUpload(intent['media_id'], token);

      console.log('The uploaded media check', uploaded)

      if (!uploaded) {
        return null
      }

      // update the data with the new media_id
      data.media_source.media_id = intent['media_id'];
      const uploadedEntireVideo = await uploadEntireVidContentToPin(token, data);

      if (!uploadedEntireVideo) {
        return null
      }

      // video Pin has been uploaded!
      return uploadedEntireVideo

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
        

        await sendNotificationEmail(userInfo, platform, 'post rejection', '');

        // send success to the front-end
        return res.status(201).json({ success: 'ok' });

      } else {
        
        // publish the post to Pinterest
        // check the media type first
        const user = await UserModel.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(userId) } },
          { $unwind: "$socialMediaLinks" },
          { $unwind: "$socialMediaLinks.posts" },
          { $match: { "socialMediaLinks.posts._id": new mongoose.Types.ObjectId(postId) } },
          { $project: { _id: 0, post: "$socialMediaLinks.posts" } }
        ]);

        const userPost = user ? user[0].post : '';

        const hostId = userPost.hostUserId;

        const hostUser = await UserModel.findOne(
          { 
            _id: new mongoose.Types.ObjectId(hostId), 
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

        // the sending user's profileLink
        const usr = await UserModel.findOne({ _id: userId })
        const pinterestUsr = usr.socialMediaLinks.find(el => el.platformName === 'pinterest')
        const userProfileUsername = he.decode(pinterestUsr.profileLink).match(/\/([^/]+)\/?$/)[1];

        // this is the id of the published post
        let publishedPostLink = 'https://www.pinterest.com/pin/';

        if (userPost && userPost.content.media.mediaType === 'image') {

          // structure the image upload data
          const data = {
            title: _.startCase(userPost.content.textualData.pinterest.title),
            description: userPost.content.textualData.pinterest.description + ' | 📌 By ' + '#' + userProfileUsername,
            link: he.decode(userPost.content.textualData.pinterest.destinationLink),
            board_id: selectedBoard,
            media_source: {
              source_type: "image_url",
              url: `https://sumbroo-media-upload.s3.us-east-1.amazonaws.com/${platform}-${userId}`
            }
          };

          // call a function to post an Image to Pinterest 
          const pinUploaded = await createPin(data, accessToken)

          publishedPostLink += pinUploaded.id;

          // add the current UTC date to HostUser
          // hostUser

          console.log('The PinUpload Results', pinUploaded.id)

          if (!pinUploaded) {
            return res.status(400).json({ error: pinUploaded });
          } 

        }

        if (userPost && userPost.content.media.mediaType === 'video') {

          const FILE_KEY = 'pinterest-video-cover-' + user._id;

          // structure the image upload data
          const data = {
            title: _.startCase(userPost.content.textualData.pinterest.title),
            description: userPost.content.textualData.pinterest.description + ' | 📌 By ' + '#' + userProfileUsername,
            link: he.decode(userPost.content.textualData.pinterest.destinationLink),
            board_id: selectedBoard,
            media_source: {
              source_type: "video_id",
              cover_image_url: `https://sumbroo-media-upload.s3.us-east-1.amazonaws.com/${FILE_KEY}`,
              media_id: ""
            }
          };

          // call the function to post to Pinterest Video
          const pinResults = await createPinVideo(userId, platform, data, accessToken);

          console.log('The video posting results', pinResults)

          publishedPostLink += pinResults.id;

          if (!pinResults) {
            return res.status(400).json({ error: pinUploaded });
          }

        }

        // send the email
        await sendNotificationEmail(userInfo, platform, 'post approval', publishedPostLink);

        // update the hostUser's lastReceivingDate to the latest date
        await UserModel.updateOne(
          { 
            _id: new mongoose.Types.ObjectId(hostId), 
            "socialMediaLinks.platformName": 'pinterest' // switch to dynamic variable as needed
          },
          { 
            $currentDate: { "socialMediaLinks.$.lastReceivingDate": true }
          }
        );
        

        // update the postStatus to published 
        // remove the content
        // add the postLink
        await UserModel.updateOne(
          { 
            _id: new mongoose.Types.ObjectId(userId), 
            "socialMediaLinks.posts._id": new mongoose.Types.ObjectId(postId)
          },
          { 
            $set: { 
              "socialMediaLinks.$.posts.$[elem].postStatus": "published",
              "socialMediaLinks.$.posts.$[elem].postLink": publishedPostLink,
              "socialMediaLinks.$.posts.$[elem].postId": publishedPostLink.match(/\d+$/)[0],
              "socialMediaLinks.$.posts.$[elem].publishingDate": new Date() // update the publishing date to the latest date
            },
            $unset: { "socialMediaLinks.$.posts.$[elem].content": "" }
          },
          { 
            arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(postId) }]
          }
        );

        // send success to the front-end
        return res.status(201).json({ success: 'ok' });

      }
      

    } catch (err) {
      console.error("Error retrieving users:", err);
      return res.status(400).json({ msg: 'No New Users' });
    }

}
