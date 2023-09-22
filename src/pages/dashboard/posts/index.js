import Header from "../../../../components/Header";
import { useRouter } from "next/router";
import _ from 'lodash'


function getHoursLeft(dateString) {

  const dateObj = new Date(dateString); // Ensure it's treated as UTC

  const now = new Date();
  const nowUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
  
  const diffMilliseconds = nowUTC - dateObj;
  const diffHours = Math.floor(diffMilliseconds / (1000 * 60 * 60));
  
  const result = `${12 - diffHours} Hours left`;
  return result
  
}


const Posts = ({ posts }) => {

    const router = useRouter();

    return (<div className="dashboard-container">
        <Header />
        <div className="posts-container">

          {
            posts.length === 0 ?
              <img src="/zenMode.svg" width={200} />
             :''
          }

          {
            posts && posts.map((post, i) => {
              return (<div key={i} className="post-container" 
              onClick={() => router.push(`/dashboard/posts/${post.userId}-${post.platform}`)}>
                  <p>{_.startCase(post.pinTitle)}</p>
                  <div>
                    <img width={25} src={`/sm/${post.platform}.svg`} />
                  </div>
                  <p>{getHoursLeft(post.publishingDate)}</p>
              </div>)
            })
          }
          
        </div>
    </div>
    )

};

export default Posts;



export async function getServerSideProps(context) {

  const { parseCookies } = require('../../../../utils/parseCookies');
  const { verifyToken } = require('../../../../utils/verifyToken');
  const connectUserDB = require('../../../../utils/connectUserDB');
  const User = require('../../../../utils/customers/User');

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

  let posts;

  try {

    // connectUserDB
    await connectUserDB();

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


    // here set the data to the posts before your return it
    posts = postsInReview;
  
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
      posts
    }
  };

}
