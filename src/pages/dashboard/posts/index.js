import { parseCookies } from "../../../../utils/parseCookies"
import { verifyToken } from "../../../../utils/verifyToken";
import Header from "../../../../components/Header";
import localForage from 'localforage';
import { useEffect, useState } from "react";
import { useRouter } from "next/router";



const Posts = ({ posts }) => {

    const router = useRouter();

    useEffect(() => {
        if (data.users.length > 0) {
            localForage.setItem('applications', data.users).then(() => {
                console.log('Data has been stored in IndexedDB.');
            }).catch(error => {
                console.error('Error saving data to IndexedDB:', error);
            });
        } 
    }, [data]);


    return (<div className="dashboard-container">
        <Header />
        <div className="applications-container">
            {
              data.users.length === 0 ?
                <img src="/zenMode.svg" width={200} />
               :''
            }

            {
                data.users && data.users.map((user, i) => {
                    return (<div key={i} className="application-container" 
                    onClick={() => router.push(`/dashboard/applications/${user._id}`)}>
                        <p>{user.name}</p>
                        <div>{
                            user.socialMediaLinks.map((socialMedia, index) => {
                               return <img key={index} width={25} src={`/sm/${socialMedia.platformName}.svg`} />
                            })
                        }</div>
                        <p>{getHoursLeft(user.applicationDate)}</p>
                    </div>)
                })
            }
        </div>

    </div>
    )

};

export default Posts;



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

    let posts;

    try {
      const response = await fetch('http://localhost:3000/api/getPosts', {
        method: 'GET'
      });

      console.log(response)
    
      if (!response.ok) {
        throw new Error('Server error');
      }
    
      posts = await response.json();
    
    } catch (error) {
      console.error('Server error', error.message);
      return {
        props: {
          error: true
        }
      };
    }

    console.log(data, typeof data)

    return {
      props: {
        posts
      }
    };
}
