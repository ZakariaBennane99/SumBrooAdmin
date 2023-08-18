import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

const Header = () => {

    const router = useRouter();
    const [adminName, setAdminName] = useState('');

    useEffect(() => {
        // Only runs in the client side after the initial render
        setAdminName(localStorage.getItem("adminName"));
    }, []);

    return (
        <div id="header">
            <span className='logo' onClick={() => router.push('/dashboard')}>
                <img src='/logo.svg' alt='logo' />
                <span className='logo-text'>
                  <span style={{ fontWeight: 'bold' }}>Sum</span>
                  <span style={{ fontWeight: 'regular' }}>Broo</span>
                </span>
            </span>

            <span id='admin-name'>{adminName}</span>
        </div>
    )
}

export default Header

