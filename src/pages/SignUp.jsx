import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { IoMail, IoLockClosed, IoPerson } from 'react-icons/io5';
import { FcGoogle } from 'react-icons/fc';
import { signUpWithEmail, signInWithGoogle } from '../firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './Auth.css';

const SignUp = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      addToast('Account created successfully!', 'success');
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
      addToast('Welcome to TripVault!', 'success');
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
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Start capturing your travel experiences</p>
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
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            icon={<IoPerson />}
            required
          />
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
            placeholder="Min 6 characters"
            icon={<IoLockClosed />}
            required
          />
          <Button type="submit" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
