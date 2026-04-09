import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IoLocation, IoCalendar, IoWallet, IoTrash, IoPencil,
  IoArrowBack, IoMap, IoReceipt, IoJournal, IoInformation
} from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getTrip, deleteTrip, updateTrip } from '../firebase/firestore';
import { formatDate, getDaysBetween } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import ItineraryTab from '../components/itinerary/ItineraryTab';
import ExpenseTab from '../components/expenses/ExpenseTab';
import JournalTab from '../components/journal/JournalTab';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import './TripDetail.css';

const tabs = [
  { id: 'overview', label: 'Overview', icon: <IoInformation /> },
  { id: 'itinerary', label: 'Itinerary', icon: <IoMap /> },
  { id: 'expenses', label: 'Expenses', icon: <IoReceipt /> },
  { id: 'journal', label: 'Journal', icon: <IoJournal /> },
];

const TripDetail = () => {
  const { id } = useParams();
  const { user, userProfile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const currency = userProfile?.currency || 'INR';

  useEffect(() => {
    const loadTrip = async () => {
      const data = await getTrip(user.uid, id);
      if (data) {
        setTrip(data);
        setEditForm({
          title: data.title || '',
          destination: data.destination || '',
          startDate: data.startDate ? (data.startDate.toDate ? data.startDate.toDate().toISOString().split('T')[0] : new Date(data.startDate).toISOString().split('T')[0]) : '',
          endDate: data.endDate ? (data.endDate.toDate ? data.endDate.toDate().toISOString().split('T')[0] : new Date(data.endDate).toISOString().split('T')[0]) : '',
          description: data.description || '',
          budget: data.budget || '',
          status: data.status || 'planning',
        });
      } else {
        addToast('Trip not found', 'error');
        navigate('/dashboard');
      }
      setLoading(false);
    };
    loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTrip(user.uid, id);
      addToast('Trip deleted', 'success');
      navigate('/dashboard');
    } catch {
      addToast('Failed to delete trip', 'error');
    }
    setDeleting(false);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTrip(user.uid, id, {
        ...editForm,
        budget: editForm.budget ? Number(editForm.budget) : 0,
        startDate: editForm.startDate ? new Date(editForm.startDate) : null,
        endDate: editForm.endDate ? new Date(editForm.endDate) : null,
      });
      const updated = await getTrip(user.uid, id);
      setTrip(updated);
      setShowEdit(false);
      addToast('Trip updated', 'success');
    } catch {
      addToast('Failed to update trip', 'error');
    }
    setSaving(false);
  };

  if (loading) return <Loader fullScreen text="Loading trip..." />;
  if (!trip) return null;

  const days = getDaysBetween(trip.startDate, trip.endDate);

  return (
    <div className="trip-detail">
      <div className="trip-detail-inner">
        {/* Back & Actions */}
        <div className="trip-topbar animate-fade-in">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <IoArrowBack /> Back
          </button>
          <div className="trip-actions">
            <Button variant="ghost" size="sm" icon={<IoPencil />} onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" icon={<IoTrash />} onClick={() => setShowDelete(true)}
              className="delete-trip-btn">
              Delete
            </Button>
          </div>
        </div>

        {/* Hero */}
        <div className="trip-hero animate-fade-in-up">
          <div className="trip-hero-info">
            <span className={`trip-status-badge status-${trip.status}`}>
              {trip.status}
            </span>
            <h1 className="text-h1 trip-title">{trip.title}</h1>
            <div className="trip-meta-row">
              <span className="trip-meta"><IoLocation /> {trip.destination}</span>
              {trip.startDate && (
                <span className="trip-meta"><IoCalendar /> {formatDate(trip.startDate)}{trip.endDate ? ` – ${formatDate(trip.endDate)}` : ''}</span>
              )}
              {days > 0 && <span className="trip-meta">{days} day{days > 1 ? 's' : ''}</span>}
              {trip.budget > 0 && (
                <span className="trip-meta"><IoWallet /> Budget: {formatCurrency(trip.budget, currency)}</span>
              )}
            </div>
            {trip.description && <p className="trip-desc">{trip.description}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="trip-tabs animate-fade-in-up stagger-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`trip-tab ${activeTab === tab.id ? 'trip-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="trip-tab-content animate-fade-in">
          {activeTab === 'overview' && (
            <div className="overview-content">
              <div className="overview-grid">
                <div className="overview-card glass">
                  <span className="text-label">Destination</span>
                  <h3>{trip.destination}</h3>
                </div>
                <div className="overview-card glass">
                  <span className="text-label">Duration</span>
                  <h3>{days > 0 ? `${days} days` : 'Not set'}</h3>
                </div>
                <div className="overview-card glass">
                  <span className="text-label">Budget</span>
                  <h3>{trip.budget > 0 ? formatCurrency(trip.budget, currency) : 'Not set'}</h3>
                </div>
                <div className="overview-card glass">
                  <span className="text-label">Status</span>
                  <h3 style={{ textTransform: 'capitalize' }}>{trip.status}</h3>
                </div>
              </div>
              {trip.description && (
                <div className="overview-desc glass">
                  <span className="text-label">Description</span>
                  <p>{trip.description}</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'itinerary' && <ItineraryTab tripId={id} trip={trip} />}
          {activeTab === 'expenses' && <ExpenseTab tripId={id} currency={currency} trip={trip} />}
          {activeTab === 'journal' && <JournalTab tripId={id} />}
        </div>
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Trip"
        message={`Are you sure you want to delete "${trip.title}"? This will also remove all itinerary, expense, and journal data. This cannot be undone.`}
        loading={deleting}
      />

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Trip" size="md">
        <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} list="edit-trip-title-suggestions" required />
          <Input label="Destination" value={editForm.destination} onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })} required />
          <div className="form-row">
            <Input label="Start Date" type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} required />
            <Input label="End Date" type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} required />
          </div>
          <Input label="Budget" type="number" value={editForm.budget} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })} required />
          <Input label="Description" type="textarea" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} required />
          
          <datalist id="edit-trip-title-suggestions">
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
                <button key={s} type="button" className={`status-option ${editForm.status === s ? 'status-selected' : ''}`}
                  onClick={() => setEditForm({ ...editForm, status: s })}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TripDetail;
