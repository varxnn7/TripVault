import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoAirplane, IoLocation, IoCalendar, IoWallet, IoDocumentText } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { createTrip } from '../firebase/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './NewTrip.css';

const NewTrip = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
    budget: '',
    status: 'planning',
  });

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.destination.trim()) {
      addToast('Title and destination are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const tripId = await createTrip(user.uid, {
        ...form,
        budget: form.budget ? Number(form.budget) : 0,
        startDate: form.startDate ? new Date(form.startDate) : null,
        endDate: form.endDate ? new Date(form.endDate) : null,
        coverPhoto: '',
        sharedWith: [],
      });
      addToast('Trip created successfully!', 'success');
      navigate(`/trip/${tripId}`);
    } catch {
      addToast('Failed to create trip', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="new-trip-page">
      <div className="new-trip-inner animate-fade-in-up">
        <div className="new-trip-header">
          <div className="new-trip-icon">
            <IoAirplane />
          </div>
          <h1 className="text-h2">Create New Trip</h1>
          <p className="new-trip-subtitle">Plan your next adventure</p>
        </div>

        <form onSubmit={handleSubmit} className="new-trip-form">
          <Input
            label="Trip Title"
            value={form.title}
            onChange={handleChange('title')}
            placeholder="e.g., Kerala Backwaters Adventure"
            icon={<IoAirplane />}
            list="trip-title-suggestions"
            required
          />
          <Input
            label="Destination"
            value={form.destination}
            onChange={handleChange('destination')}
            placeholder="e.g., Kochi, Kerala"
            icon={<IoLocation />}
            required
          />
          <div className="form-row">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={handleChange('startDate')}
              icon={<IoCalendar />}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={handleChange('endDate')}
              icon={<IoCalendar />}
              required
            />
          </div>
          <Input
            label="Budget"
            type="number"
            value={form.budget}
            onChange={handleChange('budget')}
            placeholder="e.g., 50000"
            icon={<IoWallet />}
            required
          />
          <Input
            label="Description"
            type="textarea"
            value={form.description}
            onChange={handleChange('description')}
            placeholder="Describe your trip plans..."
            icon={<IoDocumentText />}
            required
          />

          <datalist id="trip-title-suggestions">
            <option value="Summer Vacation" />
            <option value="Weekend Getaway" />
            <option value="Business Trip" />
            <option value="Family Holiday" />
            <option value="Solo Adventure" />
            <option value="Honeymoon" />
            <option value="Road Trip" />
            <option value="Backpacking" />
          </datalist>

          <div className="form-field">
            <label className="input-label">Status</label>
            <div className="status-options">
              {['planning', 'ongoing', 'completed'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`status-option ${form.status === s ? 'status-selected' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Trip</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTrip;
