import { Link } from 'react-router-dom';
import { IoLocation, IoCalendar, IoArrowForward } from 'react-icons/io5';
import { formatDate } from '../../utils/formatDate';
import './TripCard.css';

const statusColors = {
  planning: 'status-planning',
  ongoing: 'status-ongoing',
  completed: 'status-completed',
};

const TripCard = ({ trip, index }) => {
  return (
    <Link
      to={`/trip/${trip.id}`}
      className={`trip-card glass animate-fade-in-up`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="trip-card-cover">
        {trip.coverPhoto ? (
          <img src={trip.coverPhoto} alt={trip.title} className="trip-cover-img" />
        ) : (
          <div className="trip-cover-placeholder">
            <IoLocation />
          </div>
        )}
        <span className={`trip-status ${statusColors[trip.status] || ''}`}>
          {trip.status || 'planning'}
        </span>
      </div>
      <div className="trip-card-body">
        <h3 className="trip-card-title">{trip.title}</h3>
        <div className="trip-card-meta">
          <span className="trip-meta-item">
            <IoLocation /> {trip.destination || 'No destination'}
          </span>
          <span className="trip-meta-item">
            <IoCalendar /> {formatDate(trip.startDate)}
          </span>
        </div>
        {trip.description && (
          <p className="trip-card-desc">{trip.description}</p>
        )}
      </div>
      <div className="trip-card-footer">
        <span className="trip-view-link">View Details <IoArrowForward /></span>
      </div>
    </Link>
  );
};

export default TripCard;
