import { parseCookies } from "../../../../utils/parseCookies"
import { verifyToken } from "../../../../utils/verifyToken";
import Header from "../../../../components/Header";
import PinterestPreview from "../../../../components/PinterestPreview"
import { useEffect, useState } from "react";



function getHoursLeft(dateString) {

  const dateObj = new Date(dateString); // Ensure it's treated as UTC

  const now = new Date();
  const nowUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
  
  const diffMilliseconds = nowUTC - dateObj;
  const diffHours = Math.floor(diffMilliseconds / (1000 * 60 * 60));
  
  const result = `${48 - diffHours} Hours left`;
  return result
  
}

const Application = ({ post }) => {

    const [app, setApp] = useState(null)

    const [selected, setSelected] = useState([]);

    const isSelected = (platformName, status) => {
      const platform = selected.find(item => item.platform === platformName);
      return platform && platform.status === status;
    };

    const handleClick = (platformName, value) => {
      const updatedList = selected.filter(item => item.platform !== platformName);
      updatedList.push({ platform: platformName, status: value });
      setSelected(updatedList);
    };

    useEffect(() => {
        localForage.getItem('applications').then(data => {
            console.log(data.filter(dt => dt._id === userId))
            setApp(data.filter(dt => dt._id === userId))
        }).catch(error => {
            console.error('Error getting data from IndexedDB:', error);
        });
    }, []);

    const handleExternalClick = (e) => {
        window.open(e.currentTarget.getAttribute('data-url'), "_blank");
    };

    async function handleSendClick() {
        try {
            const response = await fetch('http://localhost:3000/api/handleApplications', {
              method: 'POST', 
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ userId: userId, decision: selected })
            });
        
            if (!response.ok) {
              throw new Error('Server error');
            }
        
            const data = await response.json();
            console.log(data)
            router.push('/dashboard/applications')
          } catch (error) {
            console.error('Server error', error.message);
          }
    }

    return (<div className="dashboard-container">
        <Header />
        <div className="applications-container">
            <PinterestPreview 
               
            />
        </div>
    </div>
    )

};

export default Application;


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

      console.log('this is the data', data)

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