import { parseCookies } from "../../../../utils/parseCookies"
import { verifyToken } from "../../../../utils/verifyToken";
import Header from "../../../../components/Header";
import localForage from 'localforage';
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

const Application = ({ userId }) => {

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
            {
                app && app.map(el => {
                    return (
                        <div className="main-application-container">
                            <span className="name-date"><span>{el.name}</span> <span>{getHoursLeft(el.applicationDate)}</span></span>
                            {
                                el.socialMediaLinks.map(sm => {
                                    return (
                                        <div className="sm-container">

                                            <div className="link-container">
                                                <span>{sm.platformName.charAt(0).toUpperCase() + sm.platformName.slice(1)} Profile Link</span>
                                                <p data-url={sm.profileLink} onClick={handleExternalClick}>{sm.profileLink}</p>
                                            </div>

                                            <div className="decision-container">
                                                <div className="checkbox-container">
                                                    <div className="accept-container">
                                                        Accept
                                                        <div 
                                                            className={`custom-checkmark ${isSelected(sm.platformName, 'accept') ? 'selected' : ''}`} 
                                                            onClick={() => handleClick(sm.platformName, 'accept')}
                                                        ></div>
                                                        </div>
                                                    <div className="reject-container">
                                                        Reject
                                                      <div 
                                                            className={`custom-checkmark ${isSelected(sm.platformName, 'reject') ? 'selected' : ''}`} 
                                                            onClick={() => handleClick(sm.platformName, 'reject')}
                                                      ></div>
                                                    </div>
                                                </div>
                                                {
                                                    selected.length > 0 && selected.find(el => el.platform === sm.platformName).status === 'reject' ? 
                                                    <textarea 
                                                        placeholder="A comment on the rejection" 
                                                        onChange={(e) => {
                                                            const index = selected.findIndex(item => item.platform === sm.platformName);
                                                            if(index !== -1) {
                                                                const updatedSelection = [...selected];
                                                                updatedSelection[index].comment = e.target.value;
                                                                setSelected(updatedSelection);
                                                            }
                                                        }}
                                                    />
                                                     : ''
                                                }
                                                {
                                                  selected.length > 0 && selected.find(el => el.platform === sm.platformName).status === 'accept' ? 
                                                  <>
                                                  <div className="niche-container">
                                                  <label htmlFor="niche">Niche</label>
                                                  <input id="niche" placeholder="Profile niche"
                                                    onChange={(e) => {
                                                      const index = selected.findIndex(item => item.platform === sm.platformName);
                                                      if(index !== -1) {
                                                          const updatedSelection = [...selected];
                                                          updatedSelection[index].niche = e.target.value;
                                                          setSelected(updatedSelection);
                                                      }
                                                    }} />
                                                </div>

                                                <div className="niche-tags-container">
                                                  <label htmlFor="niche-tags">Niche Tags</label>
                                                  <input id="niche-tags" placeholder="e.g. health, funny..."
                                                    onChange={(e) => {
                                                      const index = selected.findIndex(item => item.platform === sm.platformName);
                                                      if(index !== -1) {
                                                          const updatedSelection = [...selected];
                                                          updatedSelection[index].nicheTags = e.target.value;
                                                          setSelected(updatedSelection);
                                                      }}
                                                      } />
                                                </div></> : ''
                                                
                                                }

                                            </div>

                                        </div>
                                    )
                                })
                            }
                            <button style={{ marginTop: '0px' }} onClick={handleSendClick}>Confirm</button>
                        </div>
                    )
                })
            }
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

    const userId = context.query.userId;
  
    return {
      props: {
        userId
      }
    };
}