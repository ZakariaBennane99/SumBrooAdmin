import { parseCookies } from "../../../../utils/parseCookies"
import { verifyToken } from "../../../../utils/verifyToken";
import Header from "../../../../components/Header";
import PinterestPreview from "../../../../components/PinterestPreview"
import { useState } from "react";


const Post = ({ post }) => {
  
  const [isReject, setIsReject] = useState(false);
  const [comment, setComment] = useState("");

  const handleRejectChange = (event) => {
    setIsReject(event.target.checked);
  };

  const handleCommentChange = (event) => {
    setComment(event.target.value);
  };

  return (
    <div className="dashboard-container">
      <Header />
      <div className="applications-container">
        <PinterestPreview
          pinTitle={post.pinTitle}
          pinLink={post.pinLink}
          text={post.content.textualData.pinterest.description}
          imgUrl={post.content.media.mediaType === 'image' ? post.content.media.awsLink : ''}
          videoUrl={post.content.media.mediaType === 'video' ? post.content.media.awsLink : ''}
          userProfileLink={post.profileLink}
        />
        <div>
          <div>
            <label>Accept/Reject</label>
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
            <div>
              <label>Comment</label>
              <textarea
                value={comment}
                onChange={handleCommentChange}
                placeholder="A comment on the rejection"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Post;


export async function getServerSideProps(context) {

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

      const response = await fetch('http://localhost:3000/api/getPost', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, platform })
      });
    
      if (!response.ok) {
        throw new Error('Server error');
      }

      let data = await response.json();

      console.log('The response', data)

      // here set the data to the posts before your return it
      post = data.post;
    
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