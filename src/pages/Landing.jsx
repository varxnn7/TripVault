import { Link } from 'react-router-dom';
import { IoCompass, IoWallet, IoCamera, IoCalendar, IoShareSocial, IoPhonePortrait, IoArrowForward } from 'react-icons/io5';
import './Landing.css';

const features = [
  { icon: <IoCompass />, title: "Trip Management", desc: "Organize destinations, dates, and travel details in one place" },
  { icon: <IoCalendar />, title: "Day-by-Day Itinerary", desc: "Plan activities for each day with timeline views" },
  { icon: <IoWallet />, title: "Expense Tracker", desc: "Track spending with budget insights and category breakdowns" },
  { icon: <IoCamera />, title: "Photo Journal", desc: "Document your journey with photos and personal notes" },
  { icon: <IoShareSocial />, title: "Trip Sharing", desc: "Share your travel plans with friends and family" },
  { icon: <IoPhonePortrait />, title: "Mobile First", desc: "Install on your phone for offline access anywhere" },
];

const Landing = () => {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid" />
          <div className="hero-glow" />
        </div>
        <div className="hero-content animate-fade-in-up">
          <span className="hero-badge">
            <span className="badge-dot" />
            Travel & Tourism
          </span>
          <h1 className="text-display hero-title">
            Capture Every<br />
            <span className="hero-highlight">Moment</span> of Your<br />
            Journey
          </h1>
          <p className="hero-subtitle">
            Your all-in-one travel companion. Plan itineraries, track expenses,
            journal memories — all from your pocket.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="hero-cta">
              Start Your Journey <IoArrowForward />
            </Link>
            <Link to="/login" className="hero-cta-secondary">
              Sign In
            </Link>
          </div>
        </div>
        <div className="hero-stats animate-fade-in-up stagger-3">
          <div className="stat-item">
            <span className="stat-number">100%</span>
            <span className="stat-label">Free to Use</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">PWA</span>
            <span className="stat-label">Install on Phone</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">∞</span>
            <span className="stat-label">Trips & Memories</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="features-header animate-fade-in-up">
          <span className="text-label">Features</span>
          <h2 className="text-h1">Everything You Need<br />For Your Trips</h2>
        </div>
        <div className="features-grid">
          {features.map((feature, i) => (
            <div key={i} className={`feature-card glass animate-fade-in-up stagger-${i + 1}`}>
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content animate-fade-in-up">
          <h2 className="text-h1">Ready to Explore?</h2>
          <p className="cta-desc">Join TripVault and start capturing your travel experiences today.</p>
          <Link to="/signup" className="hero-cta">
            Create Free Account <IoArrowForward />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="logo-icon">◆</span>
            <span>TripVault</span>
          </div>
          <p className="footer-text">
            2026 rights reserved
          </p>
          <p className="footer-copy">© 2026 TripVault. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
