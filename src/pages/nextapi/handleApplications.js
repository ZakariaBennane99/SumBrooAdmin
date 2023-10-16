import { connectUserDB } from '../../../utils/connectUserDB';
import { verifyToken } from '../../../utils/verifyToken';  
import { parseCookies } from '../../../utils/parseCookies';
import { SESClient, SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
import jwt from 'jsonwebtoken';
import { check, validationResult } from 'express-validator';


function generateOnboardingToken(userId) {

    const payload = {
      userId,
      action: 'onboarding'
    };
  
    // Set the token to expire in 24 hours
    const token = jwt.sign(payload, process.env.JWT_SECRET_FOR_LINK, { expiresIn: '24h' });
  
    return token;
    
}

function capitalize(st) {
    return st.charAt(0).toUpperCase() + st.slice(1)
}

function arrayToEnglishList(arr) {

    // If there's only one item, return it
    if (arr.length === 1) {
        return arr[0];
    }

    // If there are two items, join with ' and '
    if (arr.length === 2) {
        return arr.join(' and ');
    }

    // For 3 or more items, join all items with ', ' except for the last one which should be joined with ', and '
    const lastItem = arr.pop();
    return `${arr.join(', ')}, and ${lastItem}`;

}


export default async function handler(req, res) {

    if (req.method !== 'POST') {
      return res.status(405).end();
    }

    // Verify token
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.auth; 
    if (!token || !verifyToken(token)) {
      return res.status(400).json({ error: 'Server error' });
    }


    // Validate userId
    await check('userId').isString().isLength({ min: 24, max: 24 }).withMessage('User ID must be a 24-character string').run(req);
    // Validate decision as an array
    await check('decision').isArray().withMessage('Decision must be an array').run(req);
    // Validate properties of objects in decision array
    await check('decision.*.platform').isIn(['pinterest', 'otherPlatform1', 'otherPlatform2'])
        .withMessage('Platform is not valid').run(req);
    await check('decision.*.status').isIn(['accept', 'decline', 'pending'])
        .withMessage('Status is not valid').run(req);
    await check('decision.*.nicheTags').isString().withMessage('NicheTags must be a string').run(req);
    await check('decision.*.niche').isString().withMessage('Niche must be a string').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Shit again')
        return res.status(400).json({ errors: errors.array() });
    }


    // set up AWS SES
    const sesClient = new SESClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });


    try {
    
        const { userId, decision } = req.body

        console.log('The userID', userId)
        console.log('The decision', decision)

        let UserModel = await connectUserDB;
        const user = await UserModel.findOne({ _id: userId })

        console.log('The thing', decision.every(el => el.status === 'accept'))

        if (decision.every(el => el.status === 'accept')) {
            // update accountStatus to active
            user.accountStatus = 'pending';
            // update all profileStatus's to active
            // add niches and tags to the profile

            try {
                user.socialMediaLinks.forEach(sm => {
                    sm.profileStatus = 'pendingPay';
                    decision.forEach(el => {
                        if (sm.platformName === el.platform) {
                            sm.niche = el.niche;
                            sm.audience = el.nicheTags.split(',').map(word => word.trim());
                        }
                    })
                });
                await user.save();
            } catch (er) {
                console.log('The error', er)
            }
    
            // prepare an onboarding temporary link
            const onboardingLink = `http://localhost:3000/onboarding/${generateOnboardingToken(userId)}`;

            async function sendEmail(user, onboardingLink) {
                const params = {
                    Destination: {
                        ToAddresses: [user.email]
                    },
                    Template: 'Approval_Template',
                    TemplateData: JSON.stringify({
                        onBoarindLink: onboardingLink,
                        name: capitalize(user.name)
                    }),
                    Source: 'no-reply@sumbroo.com'
                };
            
                const command = new SendTemplatedEmailCommand(params);
            
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
            sendEmail(user, onboardingLink).then(result => {
                if (result.status === 200) {
                    console.log("Email sent successfully:", result.response);
                    return res.status(200).json({ ok: 'success' });
                } else {
                    console.error("Error sending email:", result.response);
                    return res.status(400).json({ error: err });
                }
            });     
    
        } else if (decision.every(el => el.status === 'reject')) {
            // now send an Approval Email
            async function sendEmail(user, decision) {
                const params = {
                    Destination: {
                        ToAddresses: [user.email]
                    },
                    Template: 'Rejection_Template',
                    TemplateData: JSON.stringify({
                        name: capitalize(user.name),
                        rejectionComments: decision
                    }),
                    Source: 'no-reply@sumbroo.com'
                };
            
                const command = new SendTemplatedEmailCommand(params);
            
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
            sendEmail(user, decision).then(result => {
                if (result.status === 200) {
                    console.log("Email sent successfully:", result.response);
                    return res.status(200).json({ ok: 'success' });
                } else {
                    console.error("Error sending email:", result.response);
                    return res.status(400).json({ error: err });
                }
            }); 

            // remove the user
            await user.remove();

        } else if (decision.some(dec => dec.status === 'reject') && decision.some(dec => dec.status === 'accept')) {
            // update accountStatus to active
            user.accountStatus = 'pending';
            let approvedPlatforms = [];
            let rejectedPlatforms = [];
            for (let i = 0; i < decision.length; i++) {
    
                if (decision[i].status === 'accept') {
                    approvedPlatforms.push(capitalize(decision[i].platform))
                    // update the platform's status
                    for (let link of user.socialMediaLinks) {
                        if (link.platformName === decision[i].platform) {
                            link.profileStatus = 'pending';
                            link.niche = decision[i].niche;
                            link.audience = decision[i].nicheTags.split(',').map(word => word.trim())
                        }
                    }
                }
    
                if (decision[i].status === 'reject') {
                    rejectedPlatforms.push(capitalize(decision[i].platform))
                    // delete the SM profile
                    user.socialMediaLinks = user.socialMediaLinks.filter(link => link.platformName !== decision[i].platform);
                    await user.save()
                }
    
            }    
    
            // prepare an onboarding temporary link
            const onboardingLink = `http://localhost:3000/onboarding/${generateOnboardingToken(userId)}`;

            async function sendEmail(user, onboardingLink) {
                
                const params = {
                    Destination: {
                        ToAddresses: [user.email]
                    },
                    Template: 'Rejection_Approval_Template',
                    TemplateData: JSON.stringify({
                        name: capitalize(user.name),
                        onBoarindLink: onboardingLink,
                        isPlural: approvedPlatforms.length > 1,
                        isRejectedPlural: rejectedPlatforms.length > 1,
                        approvedPlatforms: arrayToEnglishList(approvedPlatforms),
                        rejectedPlatforms: arrayToEnglishList(rejectedPlatforms),
                        comments: decision
                    }),
                    Source: 'no-reply@sumbroo.com'
                };
            
                const command = new SendTemplatedEmailCommand(params);
            
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
            sendEmail(user, onboardingLink).then(result => {
                if (result.status === 200) {
                    console.log("Email sent successfully:", result.response);
                    return res.status(200).json({ ok: 'success' });
                } else {
                    console.error("Error sending email:", result.response);
                    return res.status(400).json({ error: err });
                }
            }); 
        }

    } catch (err) {
        return res.status(500).json({ error: err });
    }

}