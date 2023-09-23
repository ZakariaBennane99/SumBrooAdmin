import Header from "../../../../components/Header";
import PinterestPreview from "../../../../components/PinterestPreview";
import { Tadpole } from "react-svg-spinners";
import { useState } from "react";


const Post = ({ post }) => {

  console.log('THE PPST', post)

  const postId = post.postId
  const userId = post.userId;
  const platform = post.platform;

  const [submitClicked, setSubmitClicked] = useState(false);

  const [isReject, setIsReject] = useState(false);
  const [comment, setComment] = useState("");

  const handleRejectChange = (event) => {
    setIsReject(event.target.checked);
  };

  const handleCommentChange = (event) => {
    setComment(event.target.value);
  };


  async function handleSubmit() {

    setSubmitClicked(true)

    // here you have to send whether the post was 
    // accepted or rejected, if rejected include 
    // comment. The comment should be 
    // a series of phrases each start with an emoji
    // and ends with / (to split the phrases and
    // present them nicely to the user)

    try {

      const response = await fetch('http://localhost:3000/api/postReview', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, postId, platform, isReject, comment })
      });
    
      if (!response.ok) {
        setSubmitClicked(false)
        throw new Error('Server error');
      }
      
      setSubmitClicked(false)

      let data = await response.json();

      console.log('The response', data)

    
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
                  onChange={() => setIsReject(false)}
                />
              </label>
              <label>
                Reject
                <input
                  type="radio"
                  name="acceptReject"
                  checked={isReject}
                  onChange={() => setIsReject(true)}
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
          <button className={`${submitClicked ? 'publish-btn-loading' : ''}`}
               onClick={handleSubmit} disabled={submitClicked}>
                {
                  submitClicked ? <Tadpole height={27} color='white' /> : 'Submit'
                }
          </button>
        </div>
        <PinterestPreview
          pinTitle={post.pinTitle}
          pinLink={post.pinLink}
          text={post.content.textualData.pinterest.description}
          imgUrl={post.content.media.mediaType === 'image' ? post.content.media.awsLink : ''}
          videoUrl={post.content.media.mediaType === 'video' ? post.content.media.awsLink : ''}
          userProfileLink={post.profileLink}
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

  let post;

  try {

    // connectUserDB
    let UserModel = await connectUserDB;

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

    // here set the data to the posts before your return it
    post = JSON.parse(JSON.stringify(postInReview[0]));

    console.log('THE POST', post)
  
  } catch (error) {
    console.error('Server error', error.message);
    return {
      props: {
        error: true
      }
    };
  }

  return {
    props: {
      post
    }
  };

}