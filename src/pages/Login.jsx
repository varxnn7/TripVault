import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { IoMail, IoLockClosed } from 'react-icons/io5';
import { FcGoogle } from 'react-icons/fc';
import { signInWithEmail, signInWithGoogle } from '../firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './Auth.css';

const Login = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      addToast('Welcome back!', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message.replace('Firebase: ', ''), 'error');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      addToast('Welcome back!', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message.replace('Firebase: ', ''), 'error');
    }
    setGoogleLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in-up">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <span className="logo-icon">◆</span>
            <span>TripVault</span>
          </Link>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue your journey</p>
        </div>

        <button className="google-btn" onClick={handleGoogle} disabled={googleLoading}>
          {googleLoading ? (
            <span className="btn-spinner" style={{ borderTopColor: '#fff' }} />
          ) : (
            <>
              <FcGoogle size={20} />
              Continue with Google
            </>
          )}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={<IoMail />}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            icon={<IoLockClosed />}
            required
          />
          <Button type="submit" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="auth-footer-text">
          Don't have an account? <Link to="/signup" className="auth-link">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
