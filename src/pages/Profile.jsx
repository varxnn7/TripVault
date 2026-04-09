import { useState } from 'react';
import { IoPersonCircle, IoSave, IoLogOutOutline } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { updateUserDoc } from '../firebase/firestore';
import { signOut } from '../firebase/auth';
import { getCurrencyList } from '../utils/formatCurrency';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './Profile.css';

const Profile = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState(userProfile?.currency || 'INR');

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserDoc(user.uid, { currency });
      await refreshProfile();
      addToast('Settings saved', 'success');
    } catch {
      addToast('Failed to save settings', 'error');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const currencies = getCurrencyList();

  return (
    <div className="profile-page">
      <div className="profile-inner animate-fade-in-up">
        <h1 className="text-h2">Settings</h1>

        {/* User Info */}
        <div className="profile-section glass">
          <span className="text-label">Profile</span>
          <div className="profile-user">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="profile-img" />
            ) : (
              <div className="profile-img-placeholder">
                <IoPersonCircle />
              </div>
            )}
            <div>
              <h3 className="profile-display-name">{user?.displayName || 'Traveler'}</h3>
              <p className="profile-email-text">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Currency */}
        <div className="profile-section glass">
          <span className="text-label">Currency Preference</span>
          <p className="section-desc">Choose your default currency for expense tracking</p>
          <div className="currency-grid">
            {currencies.map((c) => (
              <button
                key={c.code}
                className={`currency-btn ${currency === c.code ? 'currency-active' : ''}`}
                onClick={() => setCurrency(c.code)}
              >
                <span className="currency-symbol">{c.symbol}</span>
                <span className="currency-code">{c.code}</span>
                <span className="currency-name">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="profile-actions">
          <Button onClick={handleSave} loading={saving} icon={<IoSave />}>
            Save Settings
          </Button>
          <Button variant="ghost" onClick={handleLogout} icon={<IoLogOutOutline />}
            className="delete-trip-btn">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
