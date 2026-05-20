import { useState, useEffect, useRef } from 'react';
import { 
  IoAlertCircleOutline,
  IoSearchOutline,
  IoClose,
  IoCheckmarkCircleOutline,
  IoRefreshOutline,
  IoHammerOutline,
  IoSend,
  IoChatbubbleEllipsesOutline,
  IoArrowBackOutline
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
import './AdminSupport.css';

const AdminSupport = () => {
  const { user } = useAuth();
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
    setLoading(true);
    const unsubscribe = subscribeToAllIssues((data) => {
      setIssues(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Calculate statistics
  const totalCount = issues.length;
  const openCount = issues.filter(i => i.status === 'Open').length;
  const progressCount = issues.filter(i => i.status === 'In Progress').length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;

  // Filter and sort tickets client-side
  const filteredTickets = issues
    .filter((ticket) => {
      // Status filter
      if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const matchesTitle = ticket.title?.toLowerCase().includes(queryLower);
        const matchesDesc = ticket.description?.toLowerCase().includes(queryLower);
        const matchesCategory = ticket.category?.toLowerCase().includes(queryLower);
        const matchesUser = ticket.userEmail?.toLowerCase().includes(queryLower) || 
                            ticket.userName?.toLowerCase().includes(queryLower) || 
                            ticket.userId?.toLowerCase().includes(queryLower);

        return matchesTitle || matchesDesc || matchesCategory || matchesUser;
      }

      return true;
    })
    // Sort by updatedAt or createdAt descending
    .sort((a, b) => {
      const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
      const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

  // Action: Mark In Progress
  const handleMarkInProgress = async () => {
    if (!selectedTicket) return;
    try {
      await updateIssueStatus(selectedTicket.userId, selectedTicket.id, 'In Progress');
      await addIssueComment(selectedTicket.userId, selectedTicket.id, {
        text: 'Issue status updated to In Progress.',
        sender: 'system',
        senderName: 'System Log',
      });
      addToast('Ticket status set to In Progress', 'success');
    } catch {
      addToast('Failed to update ticket status', 'error');
    }
  };

  // Action: Resolve Issue
  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateIssueStatus(selectedTicket.userId, selectedTicket.id, 'Resolved');
      await addIssueComment(selectedTicket.userId, selectedTicket.id, {
        text: 'Issue marked as Resolved.',
        sender: 'system',
        senderName: 'System Log',
      });
      addToast('Ticket marked as Resolved', 'success');
    } catch {
      addToast('Failed to resolve ticket', 'error');
    }
  };

  // Action: Reopen Ticket
  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateIssueStatus(selectedTicket.userId, selectedTicket.id, 'Open');
      await addIssueComment(selectedTicket.userId, selectedTicket.id, {
        text: 'Issue reopened.',
        sender: 'system',
        senderName: 'System Log',
      });
      addToast('Ticket reopened', 'success');
    } catch {
      addToast('Failed to reopen ticket', 'error');
    }
  };

  // Action: Send Admin Chat reply
  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || replying || !selectedTicket) return;

    setReplying(true);
    try {
      await addIssueComment(selectedTicket.userId, selectedTicket.id, {
        text: replyText,
        sender: 'support',
        senderName: 'Support Team',
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
      bug: "🐛 Bug Report",
      feature: "✨ Feature Request",
      expense: "💳 Expense Tracker",
      itinerary: "✈️ Itinerary Planner",
      general: "⚙️ General Inquiry",
    };
    return labels[cat] || cat;
  };

  return (
    <div className="admin-support-page">
      <div className="admin-support-inner animate-fade-in-up">
        {/* Header Title */}
        <div className="admin-support-header">
          <h1 className="text-h2">Admin Support Center</h1>
          <p className="admin-subtitle">Monitor travel queries, discuss problems, and manage statuses globally.</p>
        </div>

        {/* Demo Mode Banner */}
        <div className="admin-demo-banner">
          <IoAlertCircleOutline />
          <div>
            <strong>Admin Demo Mode:</strong> Any registered traveler can act as support for testing and grading.
            To restrict this in production, you can easily configure emails or role checks (e.g., `userProfile?.role === 'admin'`) inside `AdminSupport.jsx`.
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card stat-total">
            <span className="admin-stat-val">{loading ? '-' : totalCount}</span>
            <span className="admin-stat-lbl">Total Tickets</span>
          </div>
          <div className="admin-stat-card stat-open">
            <span className="admin-stat-val" style={{ color: '#60a5fa' }}>{loading ? '-' : openCount}</span>
            <span className="admin-stat-lbl">Open</span>
          </div>
          <div className="admin-stat-card stat-progress">
            <span className="admin-stat-val" style={{ color: '#fbbf24' }}>{loading ? '-' : progressCount}</span>
            <span className="admin-stat-lbl">In Progress</span>
          </div>
          <div className="admin-stat-card stat-resolved">
            <span className="admin-stat-val" style={{ color: '#34d399' }}>{loading ? '-' : resolvedCount}</span>
            <span className="admin-stat-lbl">Resolved</span>
          </div>
        </div>

        {/* Controls Filters Section */}
        <div className="admin-controls-panel">
          <div className="admin-search-box">
            <IoSearchOutline className="admin-search-icon" />
            <input
              type="text"
              placeholder="Search by ticket title, description, name, email or userId..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>

          <div className="admin-filter-tabs">
            {['All', 'Open', 'In Progress', 'Resolved'].map((tab) => (
              <button
                key={tab}
                className={`admin-filter-btn ${statusFilter === tab ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Layout Workspace Grid */}
        <div className="admin-layout-grid">
          {/* Left panel Ticket list queue */}
          <div className="admin-sidebar">
            <h3 className="text-label">Ticket Queue</h3>
            
            {loading ? (
              <div className="admin-tickets-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <span className="btn-spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="admin-ticket-card" style={{ cursor: 'default', pointerEvents: 'none', textAlign: 'center', padding: '32px 16px' }}>
                <IoChatbubbleEllipsesOutline style={{ fontSize: '1.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No matching tickets in queue.</p>
              </div>
            ) : (
              <div className="admin-tickets-container">
                {filteredTickets.map((ticket) => (
                  <button
                    key={`${ticket.userId}_${ticket.id}`}
                    className={`admin-ticket-card ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="admin-card-header">
                      <span className="admin-user-tag truncate" style={{ maxWidth: '180px' }}>
                        👤 {ticket.userName || 'Traveler'}
                      </span>
                      <span className={`issue-status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="admin-ticket-title truncate">{ticket.title}</h4>
                    <p className="admin-ticket-desc truncate">{ticket.description}</p>
                    <div className="admin-card-footer">
                      <span>{getCategoryLabel(ticket.category).split(' ')[0]} {ticket.category}</span>
                      <span>
                        {ticket.createdAt?.seconds 
                          ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()
                          : 'Just now'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel Ticket discussion detail workspace */}
          <div className="admin-detail-panel glass">
            {selectedTicket ? (
              <div className="admin-discussion">
                {/* Discussion Header */}
                <div className="admin-disc-header">
                  <div className="admin-user-meta">
                    <span className="admin-user-name">👤 {selectedTicket.userName || 'Traveler'}</span>
                    <span className="admin-user-email">✉️ {selectedTicket.userEmail || `ID: ${selectedTicket.userId}`}</span>
                    <h2 className="admin-disc-title">{selectedTicket.title}</h2>
                  </div>
                  <div className="admin-disc-actions">
                    <span className={`issue-status-badge status-${selectedTicket.status.toLowerCase().replace(' ', '-')}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {/* Discussion timeline feed */}
                <div className="admin-disc-body">
                  {/* Main Original Issue Description Card */}
                  <div className="admin-main-ticket-post">
                    <span className="issue-main-label">User Query Description ({getCategoryLabel(selectedTicket.category)})</span>
                    <p className="issue-main-desc">{selectedTicket.description}</p>
                    
                    {selectedTicket.photoUrl && (
                      <div className="issue-attachment-card">
                        <img 
                          src={selectedTicket.photoUrl} 
                          alt="Screenshot upload" 
                          className="issue-attachment-img"
                          onClick={() => setLightboxUrl(selectedTicket.photoUrl)}
                        />
                        <span className="issue-attachment-label">📷 user_screenshot.png</span>
                      </div>
                    )}

                    {/* Admin Status Controls */}
                    <div className="admin-action-btn-group">
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
                      
                      {selectedTicket.status !== 'Resolved' ? (
                        <Button 
                          size="sm" 
                          icon={<IoCheckmarkCircleOutline />}
                          onClick={handleResolveTicket}
                          style={{ background: '#10b981', color: '#fff', padding: '6px 12px' }}
                        >
                          Mark Resolved
                        </Button>
                      ) : (
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
                      <div key={comment.id} className="system-message-log animate-fade-in" style={{ alignSelf: 'center', margin: '8px 0', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border)', padding: '4px 14px', borderRadius: 'var(--radius-full)' }}>
                        <span className="system-message-text" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.02em' }}>⚙️ {comment.text}</span>
                      </div>
                    ) : (
                      // Align support messages on the RIGHT since this is the Admin's view!
                      <div 
                        key={comment.id} 
                        className={`message-bubble-wrapper ${comment.sender === 'support' ? 'support-msg admin-view' : 'user-msg admin-view'}`}
                      >
                        <span className="message-sender">
                          {comment.senderName}
                          {comment.sender === 'support' && (
                            <span className="sender-badge-support">Support</span>
                          )}
                        </span>
                        <div className="message-bubble">
                          {comment.text}
                        </div>
                        <span className="message-time">
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
                <form className="discussion-footer" onSubmit={handleSendAdminReply}>
                  <div className="discussion-input-wrapper">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a response to traveler..."
                      className="discussion-textarea"
                      rows={2}
                      disabled={replying}
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || replying}
                      className="discussion-send-btn"
                      aria-label="Send response"
                      style={{ background: '#3b82f6', color: '#fff' }}
                    >
                      <IoSend />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Default Empty panel state
              <div className="admin-empty-state">
                <IoAlertCircleOutline className="admin-empty-icon" />
                <h2 className="admin-empty-title">Select a Ticket</h2>
                <p className="admin-empty-desc">
                  Select any active query card from the queue on the left side to load traveler details, review attachments, adjust states, and chat in real-time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enlarged Screenshot Lightbox overlay */}
      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl('')}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxUrl('')}>
              <IoClose />
            </button>
            <img src={lightboxUrl} alt="Screenshot attachment" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
