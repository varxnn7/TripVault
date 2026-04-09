import { useState, useEffect } from 'react';
import { IoAdd, IoTrash, IoCamera, IoLocation, IoJournal } from 'react-icons/io5';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { subscribeToJournal, addJournalEntry, deleteJournalEntry } from '../../firebase/firestore';
import { formatDate } from '../../utils/formatDate';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import EmptyState from '../ui/EmptyState';
import './JournalTab.css';

const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  // Defaulting to the user-provided 'ml_default' for both if env vars are missing
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
  
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ml_default';
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to upload image to Cloudinary');
    }
    
    return data.secure_url;
  } catch (error) {
    console.error("Detailed Cloudinary Error:", error);
    throw error;
  }
};

const JournalTab = ({ tripId }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [entries, setEntries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ text: '', location: '', date: '' });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const unsub = subscribeToJournal(user.uid, tripId, setEntries);
    return () => unsub();
  }, [user, tripId]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    setLoading(true);
    try {
      // Upload photos first
      let photoUrls = [];
      if (photos.length > 0) {
        setUploading(true);
        for (const file of photos) {
          try {
            const url = await uploadToCloudinary(file);
            photoUrls.push(url);
          } catch (error) {
            console.error('Cloudinary upload error for file', file.name, error);
            addToast(`Upload failed: ${error.message}`, 'error');
            throw error; // Stop adding the journal entry if photo upload fails!
          }
        }
        setUploading(false);
      }

      await addJournalEntry(user.uid, tripId, {
        text: form.text,
        location: form.location,
        date: form.date ? new Date(form.date) : new Date(),
        photos: photoUrls,
      });
      setShowModal(false);
      setForm({ text: '', location: '', date: '' });
      setPhotos([]);
      addToast('Journal entry added', 'success');
    } catch {
      addToast('Failed to add entry', 'error');
      setUploading(false);
    }
    setLoading(false);
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      await deleteJournalEntry(user.uid, tripId, entryId);
      addToast('Entry removed', 'success');
    } catch {
      addToast('Failed to remove entry', 'error');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setPhotos(files);
  };

  return (
    <div className="journal-tab">
      <div className="tab-header">
        <h2 className="text-h3">Journal</h2>
        <Button size="sm" icon={<IoAdd />} onClick={() => setShowModal(true)}>Add Entry</Button>
      </div>

      {entries.length > 0 ? (
        <div className="journal-entries">
          {entries.map((entry) => (
            <div key={entry.id} className="journal-entry glass animate-fade-in-up">
              <div className="journal-header">
                <div>
                  <span className="journal-date">{formatDate(entry.date || entry.createdAt)}</span>
                  {entry.location && (
                    <span className="journal-location"><IoLocation /> {entry.location}</span>
                  )}
                </div>
                <button className="journal-delete" onClick={() => handleDeleteEntry(entry.id)}>
                  <IoTrash />
                </button>
              </div>
              <p className="journal-text">{entry.text}</p>
              {entry.photos?.length > 0 && (
                <div className="journal-photos">
                  {entry.photos.map((url, i) => (
                    <div key={i} className="journal-photo-wrapper" onClick={() => setLightbox(url)}>
                      <img src={url} alt={`Trip photo ${i + 1}`} className="journal-photo" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<IoJournal />}
          title="No journal entries yet"
          description="Write about your trip experiences and upload photos"
          action={<Button icon={<IoAdd />} onClick={() => setShowModal(true)}>Write First Entry</Button>}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" className="lightbox-img animate-scale-in" />
        </div>
      )}

      {/* Add Entry Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Journal Entry" size="md">
        <form onSubmit={handleAddEntry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="What happened today?"
            type="textarea"
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            placeholder="Write about your experience..."
            required
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Where were you?"
            icon={<IoLocation />}
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <div className="form-field">
            <label className="input-label">Photos (max 5)</label>
            <label className="photo-upload-area">
              <IoCamera className="upload-icon" />
              <span>{photos.length > 0 ? `${photos.length} file(s) selected` : 'Click to upload photos'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="file-input-hidden"
              />
            </label>
          </div>
          {uploading && <p className="upload-status">Uploading photos...</p>}
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading || uploading}>
              {uploading ? 'Uploading...' : 'Add Entry'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Import IoJournal at top was missing — add to the icon import
export default JournalTab;
