import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IoMenu, IoClose, IoPersonCircle, IoLogOutOutline, IoSettingsOutline } from 'react-icons/io5';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../firebase/auth';
import './Navbar.css';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="navbar glass">
      <div className="navbar-inner">
        <Link to={user ? '/dashboard' : '/'} className="navbar-logo">
          <span className="logo-icon">◆</span>
          <span className="logo-text">TripVault</span>
        </Link>

        {user ? (
          <>
            <div className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}>
              <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                Dashboard
              </Link>
              <Link to="/trip/new" className={`nav-link ${location.pathname === '/trip/new' ? 'active' : ''}`}>
                New Trip
              </Link>
            </div>

            <div className="navbar-right">
              <div className="profile-menu" ref={profileRef}>
                <button className="profile-trigger" onClick={() => setProfileOpen(!profileOpen)}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="profile-avatar" />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                </button>
                {profileOpen && (
                  <div className="profile-dropdown animate-fade-in-down">
                    <div className="profile-info">
                      <p className="profile-name">{user.displayName || 'Traveler'}</p>
                      <p className="profile-email">{user.email}</p>
                    </div>
                    <div className="profile-divider" />
                    <Link to="/profile" className="profile-item">
                      <IoSettingsOutline /> Settings
                    </Link>
                    <button className="profile-item profile-logout" onClick={handleSignOut}>
                      <IoLogOutOutline /> Sign Out
                    </button>
                  </div>
                )}
              </div>

              <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <IoClose /> : <IoMenu />}
              </button>
            </div>
          </>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="nav-link">Sign In</Link>
            <Link to="/signup" className="nav-signup-btn">Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
