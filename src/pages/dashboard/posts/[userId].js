import Header from "../../../../components/Header";
import PinterestPreview from "../../../../components/PinterestPreview";
import { Tadpole } from "react-svg-spinners";
import { useState } from "react";
import { useRouter } from 'next/router';
import he from 'he';


const Post = ({ post }) => {

  const router = useRouter();

  const postId = post.postId;
  const userId = post.userId;
  const platform = post.platform;
  const pinBoards = post.pinBoards;

  const [submitClicked, setSubmitClicked] = useState(false);

  const [isReject, setIsReject] = useState(false);
  const [isAccept, setIsAccept] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [comment, setComment] = useState("");

  const handleCommentChange = (event) => {
    setComment(event.target.value);
  };


  async function handleSubmit() {

    setSubmitClicked(true)

    try {

      const response = await fetch('http://localhost:3000/api/postReview', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, postId, platform, isReject, comment, selectedBoard })
      });
    
      if (!response.ok) {
        setSubmitClicked(false)
        throw new Error('Server error');
      }
      
      setSubmitClicked(false)

      let data = await response.json();

      if (data.success === 'ok') {
        router.push('/dashboard');
      }

    
    } catch (error) {
      console.error('Server error', error.message);
      return {
        props: {
          error: true
        }
      };
    }

  }


  return (
    <div className="dashboard-container">
      <Header />
      <div className="post-Info-container">
        <div className="decision-container">
          <div className="text-section">
            <label className="label">Acceptance/Rejection</label>
            <div>
              <label>
                Accept
                <input
                  type="radio"
                  name="acceptReject"
                  checked={!isReject}
                  onChange={() => {
                    setIsReject(false);
                    setIsAccept(true);
                  }}
                />
              </label>
              <label>
                Reject
                <input
                  type="radio"
                  name="acceptReject"
                  checked={isReject}
                  onChange={() => {
                    setIsReject(true);
                    setIsAccept(false);
                  }}
                />
              </label>
            </div>
          </div>
          {isReject && (
            <div className="comment-section">
              <label>Comment</label>
              <textarea
                value={comment}
                onChange={handleCommentChange}
                placeholder="A comment on the rejection"
              />
            </div>
          )}
          {
            isAccept && (
              <div className="board-section">
                <label>Boards</label>
                {pinBoards.map((board) => (
                  <div
                    key={board.id}
                    className={`board ${selectedBoard === board.id ? 'selectedBoard' : ''}`}
                    onClick={() => setSelectedBoard(board.id)}
                    data-board-id={board.id}
                  >
                    <p><b>Name:</b> {board.name}</p>
                    <p><b>Description:</b> {board.desc}</p>
                  </div>
                ))}
              </div>
            )
          }
          <button className={`${submitClicked ? 'publish-btn-loading' : ''}`}
               onClick={handleSubmit} disabled={submitClicked}>
                {
                  submitClicked ? <Tadpole height={27} color='white' /> : 'Submit'
                }
          </button>
        </div>
        <PinterestPreview
          pinTitle={post.pinTitle}
          pinLink={he.decode(post.content.textualData.pinterest.destinationLink)}
          text={post.content.textualData.pinterest.description}
          imgUrl={post.content.media.mediaType === 'image' ? post.content.media.awsLink : ''}
          videoUrl={post.content.media.mediaType === 'video' ? post.content.media.awsLink : ''}
          userProfileLink={he.decode(post.profileLink)}
        />
      </div>
    </div>
  );
};

export default Post;


export async function getServerSideProps(context) {

  const { parseCookies } = require('../../../../utils/parseCookies');
  const { verifyToken } = require('../../../../utils/verifyToken');
  const { connectUserDB } = require('../../../../utils/connectUserDB');
  const mongoose = require('mongoose');

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

  async function fetchBoards(token) {

    const url = 'https://api.pinterest.com/v5/boards';
  
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json();
      return data
    } catch (error) {
      console.error('Fetching boards failed:', error);
    }
  }

  const cookies = context.req.headers.cookie;
  
  if (!cookies) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  
  const token = parseCookies(cookies).auth;
    
  if (!token || !verifyToken(token)) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  // now get the userId, and get the data
  const { params } = context;
  const userInfo = params.userId.split('-');

  const userId = userInfo[0];
  const platform = userInfo[1];
  const hostId = userInfo[2];

  let post;

  try {

    // connectUserDB
    let UserModel = await connectUserDB;

    // get the user token, and the refresh token
    let user = await UserModel.findOne({ _id: hostId });

    let platformData = user.socialMediaLinks.find(link => link.platformName === platform);

    // check the accessToken expiration
    const now = new Date();
    const currentUTCDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

    // check if the accessToken has expired
    if (platformData.accesstokenExpirationDate <= currentUTCDate) {
      // go refresh the token
      const { theNewToken, expiryUTCDate } = await refreshTokenForUser(platformData.refreshToken);
      // update the DB with the new token
      platformData.accessToken = theNewToken;
      platformData.accesstokenExpirationDate = expiryUTCDate;
      await user.save();
    }

    const postInReview = await UserModel.aggregate([
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
          pinTitle: "$socialMediaLinks.posts.content.textualData.pinterest.title",
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

    // here connect to the user SM using the token, then
    // get all the boards and insert them into the postInReview
    
    const res = await fetchBoards(platformData.accessToken);


    // now get the borads: id, name, description
    const pinBoards = res.items.map(board => {
      return {
        id: board.id,
        name: board.name,
        desc: board.description
      }
    })

    // here set the data to the posts before your return it
    post = JSON.parse(JSON.stringify(postInReview[0]));
    post.pinBoards = pinBoards;
  
  } catch (error) {
    console.error('Server error', error);
    return {
      props: {
        error: true
      }
    };
  }

  console.log('The post just right before sednin to the front end', post)

  return {
    props: {
      post
    }
  };

}