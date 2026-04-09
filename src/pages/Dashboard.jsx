import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IoAdd, IoAirplane, IoSearch } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTrips } from '../firebase/firestore';
import TripCard from '../components/trips/TripCard';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToTrips(user.uid, (data) => {
      setTrips(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      trip.title?.toLowerCase().includes(search.toLowerCase()) ||
      trip.destination?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || trip.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: trips.length,
    planning: trips.filter((t) => t.status === 'planning').length,
    ongoing: trips.filter((t) => t.status === 'ongoing').length,
    completed: trips.filter((t) => t.status === 'completed').length,
  };

  if (loading) return <Loader fullScreen text="Loading your trips..." />;

  return (
    <div className="dashboard">
      <div className="dashboard-inner">
        {/* Header */}
        <div className="dash-header animate-fade-in-up">
          <div>
            <h1 className="text-h1">
              Welcome back, {user?.displayName?.split(' ')[0] || 'Traveler'}
            </h1>
            <p className="dash-subtitle">Here's an overview of your journeys</p>
          </div>
          <Link to="/trip/new">
            <Button icon={<IoAdd />}>New Trip</Button>
          </Link>
        </div>

        {/* Stats */}
        {trips.length > 0 && (
          <div className="dash-stats animate-fade-in-up stagger-1">
            <div className="dash-stat-card glass">
              <span className="dash-stat-num">{stats.total}</span>
              <span className="dash-stat-label">Total Trips</span>
            </div>
            <div className="dash-stat-card glass">
              <span className="dash-stat-num">{stats.planning}</span>
              <span className="dash-stat-label">Planning</span>
            </div>
            <div className="dash-stat-card glass">
              <span className="dash-stat-num">{stats.ongoing}</span>
              <span className="dash-stat-label">Ongoing</span>
            </div>
            <div className="dash-stat-card glass">
              <span className="dash-stat-num">{stats.completed}</span>
              <span className="dash-stat-label">Completed</span>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        {trips.length > 0 && (
          <div className="dash-controls animate-fade-in-up stagger-2">
            <div className="dash-search">
              <IoSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search trips..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="dash-filters">
              {['all', 'planning', 'ongoing', 'completed'].map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${filter === f ? 'filter-active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trip Grid */}
        {filteredTrips.length > 0 ? (
          <div className="trips-grid">
            {filteredTrips.map((trip, i) => (
              <TripCard key={trip.id} trip={trip} index={i} />
            ))}
          </div>
        ) : trips.length > 0 ? (
          <EmptyState
            icon={<IoSearch />}
            title="No trips found"
            description="Try adjusting your search or filter"
          />
        ) : (
          <EmptyState
            icon={<IoAirplane />}
            title="No trips yet"
            description="Create your first trip and start capturing your travel memories"
            action={
              <Link to="/trip/new">
                <Button icon={<IoAdd />}>Create First Trip</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
