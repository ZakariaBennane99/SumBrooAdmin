import Header from "../../../../components/Header";
import localForage from 'localforage';
import { useEffect } from "react";
import { useRouter } from "next/router";


function getHoursLeft(dateString) {

  const dateObj = new Date(dateString); // Ensure it's treated as UTC

  const now = new Date();
  const nowUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
  
  const diffMilliseconds = nowUTC - dateObj;
  const diffHours = Math.floor(diffMilliseconds / (1000 * 60 * 60));
  
  const result = `${48 - diffHours} Hours left`;
  return result
  
}

const Applications = ({ data }) => {

  const router = useRouter();

  console.log('The users', data)

  useEffect(() => {
      if (data && data.length > 0) {
          localForage.setItem('applications', data).then(() => {
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
            data && data.length === 0 ?
              <img src="/zenMode.svg" width={200} />
             :''
          }
          {
              data && data.map((user, i) => {
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

export default Applications;



export async function getServerSideProps(context) {

  const { parseCookies } = require('../../../../utils/parseCookies');
  const { verifyToken } = require('../../../../utils/verifyToken');
  const { connectUserDB } = require('../../../../utils/connectUserDB');

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

  let data;

  try {

    // connectUserDB
    let UserModel = await connectUserDB;

    const users = await UserModel.find(
      { accountStatus: 'inReview' }, 
      'name applicationDate socialMediaLinks.platformName socialMediaLinks.profileLink' 
      // This second parameter is a space-separated list that defines which fields to select
      // don't forget to add applicationDate just after the name
    );
  
    data = JSON.parse(JSON.stringify(users));
  
  } catch (error) {
    console.error('The error', error);
    return {
      props: {
        error: true
      }
    };
  }

  console.log('The data', data)
  return {
    props: {
      data
    }
  };

}
