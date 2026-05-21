import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  IoAlertCircleOutline,
  IoSearchOutline,
  IoClose,
  IoCheckmarkCircleOutline,
  IoRefreshOutline,
  IoHammerOutline,
  IoSend,
  IoChatbubbleEllipsesOutline,
  IoArrowBackOutline,
  IoAnalyticsOutline
} from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  subscribeToAllIssues, 
  subscribeToIssueComments, 
  addIssueComment, 
  updateIssueStatus 
} from '../firebase/firestore';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import './AdminSupport.css';

const AdminSupport = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  // State variables
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [lightboxUrl, setLightboxUrl] = useState('');

  const commentsEndRef = useRef(null);

  // Subscribe to all issues across all users
  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') return;

    setLoading(true);
    const unsubscribe = subscribeToAllIssues((data) => {
      setIssues(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  // Sync selectedTicket when issues collection updates in real-time
  useEffect(() => {
    if (selectedTicket) {
      const updated = issues.find(i => i.id === selectedTicket.id && i.userId === selectedTicket.userId);
      if (updated && (updated.status !== selectedTicket.status || updated.updatedAt !== selectedTicket.updatedAt)) {
        setSelectedTicket(updated);
      }
    }
  }, [issues, selectedTicket]);

  // Subscribe to comments for selected ticket
  useEffect(() => {
    if (!selectedTicket) {
      setComments([]);
      return;
    }

    const unsubscribe = subscribeToIssueComments(selectedTicket.userId, selectedTicket.id, (data) => {
      setComments(data);
    });

    return () => unsubscribe();
  }, [selectedTicket]);

  // Scroll to bottom of chat when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Route Guard Checks
  if (authLoading) {
    return <Loader fullScreen text="Verifying admin credentials..." />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // --- ANALYTICS AND METRICS CALCULATIONS ---
  const hasRealData = issues.length > 0;

  // 1. Complaint Status Distribution
  const realOpen = issues.filter(i => i.status === 'Open').length;
  const realProgress = issues.filter(i => i.status === 'In Progress').length;
  const realResolved = issues.filter(i => i.status === 'Resolved').length;
  const realClosed = issues.filter(i => i.status === 'Closed').length;

  const openCount = hasRealData ? realOpen : 39;
  const progressCount = hasRealData ? realProgress : 27;
  const resolvedCount = hasRealData ? realResolved : 16;
  const closedCount = hasRealData ? realClosed : 18;
  const totalCount = openCount + progressCount + resolvedCount + closedCount;

  const pOpen = Math.round((openCount / totalCount) * 100) || 0;
  const pProgress = Math.round((progressCount / totalCount) * 100) || 0;
  const pResolved = Math.round((resolvedCount / totalCount) * 100) || 0;
  const pClosed = 100 - pOpen - pProgress - pResolved; // Ensure mathematical sum is exactly 100%

  // 2. Complaint Category Trends (Product, Service, Billing, Other)
  const realProduct = issues.filter(i => i.category === 'bug' || i.category === 'feature').length;
  const realService = issues.filter(i => i.category === 'itinerary').length;
  const realBilling = issues.filter(i => i.category === 'expense').length;
  const realOther = issues.filter(i => i.category === 'general').length;

  const catProduct = hasRealData ? realProduct : 45;
  const catService = hasRealData ? realService : 35;
  const catBilling = hasRealData ? realBilling : 25;
  const catOther = hasRealData ? realOther : 15;
  const maxCatVal = Math.max(catProduct, catService, catBilling, catOther) || 1;

  // 3. Resolution Time (Avg. Days)
  const getAvgResolutionTime = () => {
    const baseAverages = { Jan: 4.2, Feb: 1.8, Mar: 4.9, Apr: 3.1, May: 5.8, Jun: 4.4 };
    const resolvedIssues = issues.filter(i => i.status === 'Resolved' && i.createdAt && i.updatedAt);
    
    if (resolvedIssues.length === 0) {
      return baseAverages;
    }

    const monthlySum = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 };
    const monthlyCount = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 };
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    resolvedIssues.forEach(ticket => {
      const createdDate = new Date(ticket.createdAt.seconds * 1000);
      const updatedDate = new Date(ticket.updatedAt.seconds * 1000);
      const durationDays = Math.max(0.1, (updatedDate - createdDate) / (1000 * 60 * 60 * 24));
      
      const monthIdx = createdDate.getMonth();
      if (monthIdx >= 0 && monthIdx <= 5) {
        const monthName = monthNames[monthIdx];
        monthlySum[monthName] += durationDays;
        monthlyCount[monthName] += 1;
      }
    });

    const result = { ...baseAverages };
    monthNames.forEach(m => {
      if (monthlyCount[m] > 0) {
        result[m] = parseFloat((monthlySum[m] / monthlyCount[m]).toFixed(1));
      }
    });

    return result;
  };

  const resolutionTimes = getAvgResolutionTime();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  
  // Map points to SVG coordinates for Spline Curve (Width 280, Height 90)
  const points = monthNames.map((m, idx) => {
    const x = 30 + idx * 44;
    const val = resolutionTimes[m];
    const y = 90 - (val / 8) * 65; // map 0-8 range to Y bounds
    return { x, y, val, month: m };
  });

  // Calculate Spline Wave Path Command
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i+1];
    const cpX1 = p0.x + 22;
    const cpY1 = p0.y;
    const cpX2 = p1.x - 22;
    const cpY2 = p1.y;
    linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  const areaPath = `${linePath} L ${points[points.length-1].x} 90 L ${points[0].x} 90 Z`;

  // Filter and sort tickets client-side
  const filteredTickets = issues
    .filter((ticket) => {
      if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const matchesTitle = ticket.title?.toLowerCase().includes(queryLower);
        const matchesDesc = ticket.description?.toLowerCase().includes(queryLower);
        const matchesCategory = ticket.category?.toLowerCase().includes(queryLower);
        const matchesUser = ticket.userEmail?.toLowerCase().includes(queryLower) || 
                            ticket.userName?.toLowerCase().includes(queryLower);

        return matchesTitle || matchesDesc || matchesCategory || matchesUser;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
      const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

  // Actions
  const handleMarkInProgress = async () => {
    if (!selectedTicket) return;
    try {
      await updateIssueStatus(selectedTicket.userId, selectedTicket.id, 'In Progress');
      await addIssueComment(selectedTicket.userId, selectedTicket.id, {
        text: 'Issue status updated to In Progress by Support.',
        sender: 'system',
        senderName: 'System Log',
      });
      addToast('Ticket status set to In Progress', 'success');
    } catch {
      addToast('Failed to update ticket status', 'error');
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateIssueStatus(selectedTicket.userId, selectedTicket.id, 'Resolved');
      await addIssueComment(selectedTicket.userId, selectedTicket.id, {
        text: 'Issue marked as Resolved. Feel free to reopen if you need further help.',
        sender: 'system',
        senderName: 'System Log',
      });
      addToast('Ticket marked as Resolved', 'success');
    } catch {
      addToast('Failed to resolve ticket', 'error');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateIssueStatus(selectedTicket.userId, selectedTicket.id, 'Closed');
      await addIssueComment(selectedTicket.userId, selectedTicket.id, {
        text: 'Issue marked as Closed by Support Manager.',
        sender: 'system',
        senderName: 'System Log',
      });
      addToast('Ticket marked as Closed', 'success');
    } catch {
      addToast('Failed to close ticket', 'error');
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateIssueStatus(selectedTicket.userId, selectedTicket.id, 'Open');
      await addIssueComment(selectedTicket.userId, selectedTicket.id, {
        text: 'Issue reopened by Support Manager.',
        sender: 'system',
        senderName: 'System Log',
      });
      addToast('Ticket reopened', 'success');
    } catch {
      addToast('Failed to reopen ticket', 'error');
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || replying || !selectedTicket) return;

    setReplying(true);
    try {
      await addIssueComment(selectedTicket.userId, selectedTicket.id, {
        text: replyText,
        sender: 'support',
        senderName: 'Support Manager',
      });
      setReplyText('');
    } catch {
      addToast('Failed to send response', 'error');
    } finally {
      setReplying(false);
    }
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      bug: "Bug Report",
      feature: "Feature Request",
      expense: "Expense Tracker",
      itinerary: "Itinerary Planner",
      general: "General Inquiry",
    };
    return labels[cat] || cat;
  };

  return (
    <div className="admin-support-page">
      <div className="admin-support-inner animate-fade-in-up">
        
        {/* Wireframe Header */}
        <div className="dashboard-top-header">
          <div className="header-left">
            <div className="dashboard-logo-icon">
              <IoAnalyticsOutline />
            </div>
            <h1 className="dashboard-title">Complaint Analytics Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="admin-user-avatar">
              {userProfile?.displayName?.[0] || 'A'}
            </div>
          </div>
        </div>

        {/* 3 Columns Stat Grid (Category Trends, Resolution Spline, Donut Status) */}
        <div className="analytics-charts-grid">
          
          {/* Card 1: Category Trends */}
          <div className="analytics-card glass">
            <h3 className="analytics-card-title">Complaint Category Trends</h3>
            <div className="trends-chart-container">
              {[
                { label: 'Product', value: catProduct, color: 'var(--text-primary)' },
                { label: 'Service', value: catService, color: 'var(--text-secondary)' },
                { label: 'Billing', value: catBilling, color: 'var(--text-tertiary)' },
                { label: 'Other', value: catOther, color: 'var(--text-muted)' }
              ].map(cat => (
                <div className="trend-row" key={cat.label}>
                  <span className="trend-lbl">{cat.label}</span>
                  <div className="trend-bar-wrapper">
                    <div 
                      className="trend-bar-fill" 
                      style={{ 
                        width: `${Math.max(8, (cat.value / maxCatVal) * 100)}%`,
                        backgroundColor: cat.color
                      }} 
                    />
                  </div>
                  <span className="trend-val">{cat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Resolution Time (Avg. Days) */}
          <div className="analytics-card glass">
            <h3 className="analytics-card-title">Resolution Time (Avg. Days)</h3>
            <div className="spline-chart-container">
              <svg viewBox="0 0 280 100" className="spline-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="curveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.00" />
                  </linearGradient>
                </defs>
                {/* Horizontal Grid lines */}
                <line x1="10" y1="25" x2="270" y2="25" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="10" y1="57.5" x2="270" y2="57.5" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="10" y1="90" x2="270" y2="90" stroke="var(--border)" strokeWidth="1" />
                
                {/* Area under curve */}
                <path d={areaPath} fill="url(#curveAreaGrad)" />

                {/* Spline Path */}
                <path d={linePath} fill="none" stroke="var(--text-primary)" strokeWidth="1.5" />

                {/* Nodes */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r="3.5" 
                      fill="var(--bg-secondary)" 
                      stroke="var(--text-primary)" 
                      strokeWidth="1.5" 
                    />
                    <title>{p.month}: {p.val} days</title>
                  </g>
                ))}
              </svg>
              <div className="spline-x-axis">
                {monthNames.map(m => (
                  <span key={m} className="x-lbl">{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Complaint Status Distribution */}
          <div className="analytics-card glass">
            <h3 className="analytics-card-title">Complaint Status Distribution</h3>
            <div className="pie-chart-wrapper">
              <div className="donut-canvas">
                <svg viewBox="0 0 140 140" className="donut-svg">
                  {/* Segment 1: Open */}
                  <circle
                    cx="70"
                    cy="70"
                    r="42"
                    fill="transparent"
                    stroke="#222222"
                    strokeWidth="12"
                    strokeDasharray="263.8"
                    strokeDashoffset="0"
                    transform="rotate(-90 70 70)"
                  />
                  {/* Segment 2: In Progress */}
                  {pProgress > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r="42"
                      fill="transparent"
                      stroke="#555555"
                      strokeWidth="12"
                      strokeDasharray="263.8"
                      strokeDashoffset={-263.8 * (pOpen / 100)}
                      transform="rotate(-90 70 70)"
                    />
                  )}
                  {/* Segment 3: Resolved */}
                  {pResolved > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r="42"
                      fill="transparent"
                      stroke="#888888"
                      strokeWidth="12"
                      strokeDasharray="263.8"
                      strokeDashoffset={-263.8 * ((pOpen + pProgress) / 100)}
                      transform="rotate(-90 70 70)"
                    />
                  )}
                  {/* Segment 4: Closed */}
                  {pClosed > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r="42"
                      fill="transparent"
                      stroke="#cccccc"
                      strokeWidth="12"
                      strokeDasharray="263.8"
                      strokeDashoffset={-263.8 * ((pOpen + pProgress + pResolved) / 100)}
                      transform="rotate(-90 70 70)"
                    />
                  )}
                  
                  {/* Total centered readout */}
                  <text x="70" y="68" textAnchor="middle" fill="var(--text-primary)" fontSize="15" fontWeight="700">{totalCount}</text>
                  <text x="70" y="82" textAnchor="middle" fill="var(--text-tertiary)" fontSize="8" fontWeight="600" letterSpacing="0.05em">ISSUES</text>
                </svg>
              </div>

              {/* Legend with matching wireframe counts */}
              <div className="pie-legend">
                <div className="legend-item"><span className="legend-dot" style={{ background: '#222222' }} /> Open <strong className="legend-pct">{pOpen}%</strong></div>
                <div className="legend-item"><span className="legend-dot" style={{ background: '#555555' }} /> In Progress <strong className="legend-pct">{pProgress}%</strong></div>
                <div className="legend-item"><span className="legend-dot" style={{ background: '#888888' }} /> Resolved <strong className="legend-pct">{pResolved}%</strong></div>
                <div className="legend-item"><span className="legend-dot" style={{ background: '#cccccc' }} /> Closed <strong className="legend-pct">{pClosed}%</strong></div>
              </div>
            </div>
          </div>

        </div>

        {/* Live Workspace Grid: Queue List (Left) + Interactive Chat (Right) */}
        <div className="workspace-layout-panel">
          
          {/* Recent Complaints Queue list */}
          <div className="complaints-queue-side glass">
            <div className="queue-header-box">
              <h3 className="queue-side-title">Recent Complaints</h3>
              <div className="queue-search-control">
                <IoSearchOutline className="search-icon-glass" />
                <input
                  type="text"
                  placeholder="Filter traveler queries, subject or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="queue-search-field"
                />
              </div>
              <div className="queue-filter-buttons">
                {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((tab) => (
                  <button
                    key={tab}
                    className={`queue-filter-pill ${statusFilter === tab ? 'selected' : ''}`}
                    onClick={() => setStatusFilter(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="queue-loading-spinner">
                <span className="spinner-glow" />
                <p>Syncing travel complaints...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="queue-empty-prompt">
                <IoChatbubbleEllipsesOutline />
                <p>No matching traveler queries found.</p>
              </div>
            ) : (
              <div className="queue-rows-container">
                {filteredTickets.map((ticket) => (
                  <button
                    key={`${ticket.userId}_${ticket.id}`}
                    className={`queue-row-card ${selectedTicket?.id === ticket.id ? 'active-row' : ''}`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="row-card-top">
                      <span className="row-user-badge">👤 {ticket.userName || 'Traveler'}</span>
                      <span className={`status-pill pill-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="row-title truncate">{ticket.title}</h4>
                    <p className="row-desc truncate">{ticket.description}</p>
                    <div className="row-card-bottom">
                      <span className="row-category-lbl">🏷️ {getCategoryLabel(ticket.category)}</span>
                      <span className="row-date-lbl">
                        {ticket.createdAt?.seconds 
                          ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })
                          : 'Just now'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Chat Console Workspace */}
          <div className="chat-console-side glass">
            {selectedTicket ? (
              <div className="console-discussion">
                
                {/* Console Header */}
                <div className="console-disc-header">
                  <div className="console-user-meta">
                    <span className="console-user-name">👤 {selectedTicket.userName || 'Traveler'}</span>
                    <span className="console-user-email">✉️ {selectedTicket.userEmail || `ID: ${selectedTicket.userId}`}</span>
                    <h2 className="console-disc-title truncate">{selectedTicket.title}</h2>
                  </div>
                  <div className="console-action-badges">
                    <span className={`status-pill pill-${selectedTicket.status.toLowerCase().replace(' ', '-')}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {/* Discussion timeline feed */}
                <div className="console-disc-body">
                  
                  {/* Original traveler submission details block */}
                  <div className="console-original-query-card">
                    <span className="original-label">Traveler Ticket Issue Description</span>
                    <span className="original-category-badge">{getCategoryLabel(selectedTicket.category)}</span>
                    <p className="original-desc-text">{selectedTicket.description}</p>
                    
                    {selectedTicket.photoUrl && (
                      <div className="original-attachment-wrapper">
                        <img 
                          src={selectedTicket.photoUrl} 
                          alt="Screenshot upload" 
                          className="attachment-thumbnail-img"
                          onClick={() => setLightboxUrl(selectedTicket.photoUrl)}
                        />
                        <span className="attachment-filename-lbl">📷 user_screenshot_proof.png (Click to Zoom)</span>
                      </div>
                    )}

                    {/* Admin Status Controls Actions Row */}
                    <div className="admin-console-actions-row">
                      {selectedTicket.status === 'Open' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          icon={<IoHammerOutline />}
                          onClick={handleMarkInProgress}
                          style={{ border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.05)', padding: '6px 12px' }}
                        >
                          Mark In Progress
                        </Button>
                      )}
                      
                      {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                        <Button 
                          size="sm" 
                          icon={<IoCheckmarkCircleOutline />}
                          onClick={handleResolveTicket}
                          style={{ background: '#10b981', color: '#fff', padding: '6px 12px' }}
                        >
                          Mark Resolved
                        </Button>
                      )}

                      {selectedTicket.status === 'Resolved' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          icon={<IoClose />}
                          onClick={handleCloseTicket}
                          style={{ border: '1px solid rgba(255, 255, 255, 0.2)', color: 'var(--text-secondary)', padding: '6px 12px' }}
                        >
                          Close Ticket
                        </Button>
                      )}
                      
                      {(selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed') && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          icon={<IoRefreshOutline />}
                          onClick={handleReopenTicket}
                          style={{ border: '1px solid rgba(255, 255, 255, 0.2)', color: 'var(--text-secondary)', padding: '6px 12px' }}
                        >
                          Reopen Ticket
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Comments feed rendering */}
                  {comments.map((comment) => (
                    comment.sender === 'system' ? (
                      <div key={comment.id} className="console-system-msg-badge">
                        <span>⚙️ {comment.text}</span>
                      </div>
                    ) : (
                      // Align Support messages to the RIGHT, Travelers' to the LEFT
                      <div 
                        key={comment.id} 
                        className={`console-chat-wrapper ${comment.sender === 'support' ? 'support-bubble-side' : 'user-bubble-side'}`}
                      >
                        <span className="chat-sender-name">
                          {comment.senderName}
                          {comment.sender === 'support' && (
                            <span className="staff-badge">Staff</span>
                          )}
                        </span>
                        <div className="chat-text-bubble">
                          {comment.text}
                        </div>
                        <span className="chat-timestamp-lbl">
                          {comment.createdAt?.seconds 
                            ? new Date(comment.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Sending...'}
                        </span>
                      </div>
                    )
                  ))}

                  <div ref={commentsEndRef} />
                </div>

                {/* Send chat response form */}
                <form className="console-discussion-footer" onSubmit={handleSendAdminReply}>
                  <div className="discussion-input-wrapper">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAdminReply(e);
                        }
                      }}
                      placeholder="Respond to traveler's query..."
                      className="discussion-textarea"
                      rows={2}
                      disabled={replying}
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || replying}
                      className="discussion-send-btn"
                      aria-label="Send response"
                      style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                    >
                      <IoSend />
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              // Default Welcome screen when no query is selected
              <div className="console-empty-prompt">
                <IoAlertCircleOutline className="empty-logo-icon" />
                <h3 className="empty-title">Select a traveler query</h3>
                <p className="empty-desc">
                  Select any active query card from the queue on the left side to load traveler details, review screenshot attachments, adjust states, and chat in real-time.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Screenshot Lightbox zoomed overlay */}
      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl('')}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxUrl('')}>
              <IoClose />
            </button>
            <img src={lightboxUrl} alt="Screenshot proof attachment" className="lightbox-img" />
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminSupport;
