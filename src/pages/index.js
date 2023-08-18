import { useState } from "react";
import { useRouter } from 'next/router';


const Home = () => {

    const router = useRouter();

    const [error, setError] = useState(false)

    const [formValues, setFormValues] = useState({
        username: '',
        password: ''
    })

    function handleChange(e) {
  
        setError(false)
  
        return setFormValues((prev) => {
          return {...prev, [e.target.id]: e.target.value}
        })

    }

    async function handleSend() {

        try {
          const response = await fetch('/api/connectAdmins', {
            method: 'POST', 
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: formValues.username, password: formValues.password })
          });
      
          if (!response.ok) {
            setError(true)
            throw new Error('Server error');
          }
      
          const data = await response.json();
          // save Admin Name to localStorage
          localStorage.setItem('adminName', data.adminName);
          router.push('/dashboard')
      
        } catch (error) {
          console.error('Server error', error.message);
        }

    }


    return (<div className="home-container">

        <div className="log-in">
   
            { error ? 
                <p style={{ fontSize: '1.2em', marginTop: '30px', color: 'red' }}>
                    User not found</p> 
                    : "" }

            <div className="username-container">
                <label htmlFor="username">Username</label>
                <input type="string" id="username" placeholder="Enter your username" onChange={handleChange} />
            </div>

            <div className="password-container">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" placeholder="Enter your password" onChange={handleChange} />
            </div>

            <button onClick={handleSend}>Log In</button>
        </div>

    </div>
    )

};

export default Home;
