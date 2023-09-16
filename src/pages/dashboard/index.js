import { parseCookies } from "../../../utils/parseCookies";
import { verifyToken } from "../../../utils/verifyToken";
import Header from "../../../components/Header";
import { useRouter } from 'next/router';


const Dashboard = () => {

    const router = useRouter();

    return (<div className="dashboard-container">
        <Header />
        <div className="welcome-container">
            <div className="applications" onClick={() => { router.push('/dashboard/applications'); }}>
                New User Applications
            </div>

            <div className="applications" onClick={() => { router.push('/dashboard/applications'); }}>
                Existing User Applications
            </div>

            <div className="posts" onClick={() => { router.push('/dashboard/posts'); }}>
                User Posts
            </div>
        </div>

    </div>
    )

};

export default Dashboard;



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
  
    // You'll need a function to parse the cookies, get the 'auth' cookie value and validate it
    const token = parseCookies(cookies).auth;
    
    if (!token || !verifyToken(token)) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }
  
    return {
      props: {}, // your props here
    };
}
  