import { useState, useEffect } from 'react';
import { IoAdd, IoTime, IoLocation, IoTrash, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  subscribeToItinerary, addItineraryDay, updateItineraryDay, deleteItineraryDay
} from '../../firebase/firestore';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import EmptyState from '../ui/EmptyState';
import './ItineraryTab.css';

const ItineraryTab = ({ tripId }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [days, setDays] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [showActivity, setShowActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dayForm, setDayForm] = useState({ dayNumber: '', date: '', title: '' });
  const [activityForm, setActivityForm] = useState({ time: '', title: '', location: '', notes: '' });

  useEffect(() => {
    const unsub = subscribeToItinerary(user.uid, tripId, setDays);
    return () => unsub();
  }, [user, tripId]);

  const handleAddDay = async (e) => {
    e.preventDefault();
    if (!dayForm.dayNumber) return;
    setLoading(true);
    try {
      await addItineraryDay(user.uid, tripId, {
        dayNumber: Number(dayForm.dayNumber),
        date: dayForm.date ? new Date(dayForm.date) : null,
        title: dayForm.title || `Day ${dayForm.dayNumber}`,
        activities: [],
      });
      setShowModal(false);
      setDayForm({ dayNumber: '', date: '', title: '' });
      addToast('Day added', 'success');
    } catch {
      addToast('Failed to add day', 'error');
    }
    setLoading(false);
  };

  const handleAddActivity = async (dayId, existingActivities) => {
    if (!activityForm.title) return;
    setLoading(true);
    try {
      const activities = [...(existingActivities || []), { ...activityForm, id: Date.now().toString() }];
      await updateItineraryDay(user.uid, tripId, dayId, { activities });
      setShowActivity(null);
      setActivityForm({ time: '', title: '', location: '', notes: '' });
      addToast('Activity added', 'success');
    } catch {
      addToast('Failed to add activity', 'error');
    }
    setLoading(false);
  };

  const handleDeleteActivity = async (dayId, activityId, activities) => {
    try {
      const updated = activities.filter((a) => a.id !== activityId);
      await updateItineraryDay(user.uid, tripId, dayId, { activities: updated });
      addToast('Activity removed', 'success');
    } catch {
      addToast('Failed to remove activity', 'error');
    }
  };

  const handleDeleteDay = async (dayId) => {
    try {
      await deleteItineraryDay(user.uid, tripId, dayId);
      addToast('Day removed', 'success');
    } catch {
      addToast('Failed to remove day', 'error');
    }
  };

  return (
    <div className="itinerary-tab">
      <div className="tab-header">
        <h2 className="text-h3">Itinerary</h2>
        <Button size="sm" icon={<IoAdd />} onClick={() => {
          setDayForm({ dayNumber: String(days.length + 1), date: '', title: '' });
          setShowModal(true);
        }}>
          Add Day
        </Button>
      </div>

      {days.length === 0 ? (
        <EmptyState
          icon={<IoTime />}
          title="No itinerary yet"
          description="Add days and plan your activities"
          action={<Button icon={<IoAdd />} onClick={() => setShowModal(true)}>Add First Day</Button>}
        />
      ) : (
        <div className="itinerary-days">
          {days.map((day) => (
            <div key={day.id} className="day-card glass animate-fade-in-up">
              <div className="day-header" onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}>
                <div className="day-info">
                  <span className="day-number">Day {day.dayNumber}</span>
                  <span className="day-title">{day.title}</span>
                </div>
                <div className="day-right">
                  <span className="day-activity-count">
                    {day.activities?.length || 0} activities
                  </span>
                  {expandedDay === day.id ? <IoChevronUp /> : <IoChevronDown />}
                </div>
              </div>

              {expandedDay === day.id && (
                <div className="day-content animate-fade-in">
                  {day.activities?.length > 0 ? (
                    <div className="activity-list">
                      {day.activities.map((act) => (
                        <div key={act.id} className="activity-item">
                          <div className="activity-timeline">
                            <div className="timeline-dot" />
                            <div className="timeline-line" />
                          </div>
                          <div className="activity-body">
                            <div className="activity-top">
                              <div>
                                {act.time && <span className="activity-time">{act.time}</span>}
                                <h4 className="activity-title">{act.title}</h4>
                              </div>
                              <button className="activity-delete" onClick={() => handleDeleteActivity(day.id, act.id, day.activities)}>
                                <IoTrash />
                              </button>
                            </div>
                            {act.location && <p className="activity-location"><IoLocation /> {act.location}</p>}
                            {act.notes && <p className="activity-notes">{act.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-activities">No activities planned yet</p>
                  )}

                  <div className="day-actions">
                    <Button size="sm" variant="secondary" icon={<IoAdd />}
                      onClick={() => { setShowActivity(day.id); setActivityForm({ time: '', title: '', location: '', notes: '' }); }}>
                      Add Activity
                    </Button>
                    <Button size="sm" variant="ghost" icon={<IoTrash />} onClick={() => handleDeleteDay(day.id)}
                      className="delete-trip-btn">
                      Remove Day
                    </Button>
                  </div>

                  {showActivity === day.id && (
                    <div className="activity-form glass animate-fade-in-up">
                      <div className="form-row">
                        <Input label="Time" value={activityForm.time} onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })} placeholder="e.g., 09:00 AM" />
                        <Input label="Activity" value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} placeholder="What to do?" required />
                      </div>
                      <Input label="Location" value={activityForm.location} onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })} placeholder="Where?" />
                      <Input label="Notes" type="textarea" value={activityForm.notes} onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })} placeholder="Additional details..." />
                      <div className="form-actions">
                        <Button variant="ghost" size="sm" onClick={() => setShowActivity(null)}>Cancel</Button>
                        <Button size="sm" loading={loading} onClick={() => handleAddActivity(day.id, day.activities)}>Add</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Day Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Itinerary Day" size="sm">
        <form onSubmit={handleAddDay} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Day Number" type="number" value={dayForm.dayNumber} onChange={(e) => setDayForm({ ...dayForm, dayNumber: e.target.value })} required />
          <Input label="Date (optional)" type="date" value={dayForm.date} onChange={(e) => setDayForm({ ...dayForm, date: e.target.value })} />
          <Input label="Title (optional)" value={dayForm.title} onChange={(e) => setDayForm({ ...dayForm, title: e.target.value })} placeholder="e.g., Beach Day" />
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add Day</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ItineraryTab;
