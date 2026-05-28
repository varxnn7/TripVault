import { useState, useEffect, useRef, useMemo } from 'react';
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
  IoAnalyticsOutline,
  IoTicketOutline,
  IoTimeOutline,
  IoCheckmarkDoneOutline,
  IoFolderOpenOutline
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

// --- Utility: Get last N months as { key: 'Jan 25', short: 'Jan' } ---
const getLastNMonths = (n = 6) => {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(), // 0-indexed
      short: d.toLocaleString('default', { month: 'short' }),
      label: `${d.toLocaleString('default', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`,
    });
  }
  return result;
};

const AdminSupport = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  // Core state
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [lightboxUrl, setLightboxUrl] = useState('');

  const commentsEndRef = useRef(null);

  // --- Subscribe to all issues in real-time ---
  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') return;
    setLoading(true);
    const unsubscribe = subscribeToAllIssues((data) => {
      setIssues(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, userProfile]);

  // Sync selectedTicket when issues update
  useEffect(() => {
    if (selectedTicket) {
      const updated = issues.find(
        (i) => i.id === selectedTicket.id && i.userId === selectedTicket.userId
      );
      if (
        updated &&
        (updated.status !== selectedTicket.status ||
          updated.updatedAt !== selectedTicket.updatedAt)
      ) {
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
    const unsubscribe = subscribeToIssueComments(
      selectedTicket.userId,
      selectedTicket.id,
      (data) => setComments(data)
    );
    return () => unsubscribe();
  }, [selectedTicket]);

  // Auto-scroll chat
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // --- Resolution Time chart — last 6 months, purely from real data ---
  const last6Months = useMemo(() => getLastNMonths(6), []);

  const resolutionPoints = useMemo(() => {
    // Build a per-month bucket from resolved issues only
    const buckets = {};
    last6Months.forEach((m) => {
      buckets[`${m.year}-${m.month}`] = { sum: 0, count: 0 };
    });

    issues.forEach((ticket) => {
      if (ticket.status !== 'Resolved' || !ticket.createdAt?.seconds || !ticket.updatedAt?.seconds) return;
      const createdDate  = new Date(ticket.createdAt.seconds * 1000);
      const resolvedDate = new Date(ticket.updatedAt.seconds * 1000);
      const durationDays = Math.max(0, (resolvedDate - createdDate) / (1000 * 60 * 60 * 24));
      const key = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;
      if (buckets[key] !== undefined) {
        buckets[key].sum   += durationDays;
        buckets[key].count += 1;
      }
    });

    return last6Months.map((m, idx) => {
      const key = `${m.year}-${m.month}`;
      const b   = buckets[key];
      const val = b.count > 0 ? parseFloat((b.sum / b.count).toFixed(1)) : null;
      const x   = 30 + idx * 44;
      // For SVG Y coord: null (no data) → place at baseline (90)
      const maxDays = 10;
      const y = val !== null ? 90 - Math.min((val / maxDays) * 65, 65) : 88;
      return { x, y, val, month: m.short, hasData: val !== null };
    });
  }, [issues, last6Months]);

  // --- Route Guard ---
  if (authLoading) return <Loader fullScreen text="Verifying admin credentials..." />;
  if (!user || userProfile?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  // ======================================================
  // ANALYTICS — 100% derived from live `issues` data only
  // ======================================================

  const totalIssues = issues.length;

  // KPI Counts
  const openCount     = issues.filter((i) => i.status === 'Open').length;
  const progressCount = issues.filter((i) => i.status === 'In Progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;
  const closedCount   = issues.filter((i) => i.status === 'Closed').length;

  // Donut percentages (only when there is data)
  const pOpen     = totalIssues ? Math.round((openCount     / totalIssues) * 100) : 0;
  const pProgress = totalIssues ? Math.round((progressCount / totalIssues) * 100) : 0;
  const pResolved = totalIssues ? Math.round((resolvedCount / totalIssues) * 100) : 0;
  const pClosed   = totalIssues ? (100 - pOpen - pProgress - pResolved) : 0;

  // Category counts — use actual Firestore category field values
  const catBug      = issues.filter((i) => i.category === 'bug').length;
  const catFeature  = issues.filter((i) => i.category === 'feature').length;
  const catExpense  = issues.filter((i) => i.category === 'expense').length;
  const catItinerary = issues.filter((i) => i.category === 'itinerary').length;
  const catGeneral  = issues.filter((i) => i.category === 'general').length;

  const categories = [
    { label: 'Bug Report',      value: catBug,       color: '#ef4444' },
    { label: 'Feature Request', value: catFeature,   color: '#8b5cf6' },
    { label: 'Expense Tracker', value: catExpense,   color: '#f59e0b' },
    { label: 'Itinerary',       value: catItinerary, color: '#3b82f6' },
    { label: 'General',         value: catGeneral,   color: '#6b7280' },
  ];
  const maxCatVal = Math.max(...categories.map((c) => c.value), 1);

  // Build spline path from resolution points
  let linePath = `M ${resolutionPoints[0].x} ${resolutionPoints[0].y}`;
  for (let i = 0; i < resolutionPoints.length - 1; i++) {
    const p0 = resolutionPoints[i];
    const p1 = resolutionPoints[i + 1];
    const cpX1 = p0.x + 22;
    const cpY1 = p0.y;
    const cpX2 = p1.x - 22;
    const cpY2 = p1.y;
    linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  const areaPath = `${linePath} L ${resolutionPoints[resolutionPoints.length - 1].x} 90 L ${resolutionPoints[0].x} 90 Z`;

  // Average resolution time across all time (for KPI)
  const allResolved = issues.filter(
    (i) => i.status === 'Resolved' && i.createdAt?.seconds && i.updatedAt?.seconds
  );
  const avgResolutionDays =
    allResolved.length > 0
      ? (
          allResolved.reduce((sum, i) => {
            const days = (i.updatedAt.seconds - i.createdAt.seconds) / 86400;
            return sum + Math.max(0, days);
          }, 0) / allResolved.length
        ).toFixed(1)
      : '—';

  // --- Filtered & sorted ticket list ---
  const filteredTickets = issues
    .filter((ticket) => {
      if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ticket.title?.toLowerCase().includes(q) ||
          ticket.description?.toLowerCase().includes(q) ||
          ticket.category?.toLowerCase().includes(q) ||
          ticket.userEmail?.toLowerCase().includes(q) ||
          ticket.userName?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const tA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
      const tB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
      return tB - tA;
    });

  // --- Actions ---
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
      bug: 'Bug Report',
      feature: 'Feature Request',
      expense: 'Expense Tracker',
      itinerary: 'Itinerary Planner',
      general: 'General Inquiry',
    };
    return labels[cat] || cat || 'Unknown';
  };

  // KPI cards config
  const kpiCards = [
    {
      id: 'total',
      label: 'Total Issues',
      value: totalIssues,
      icon: <IoTicketOutline />,
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.2)',
    },
    {
      id: 'open',
      label: 'Open',
      value: openCount,
      icon: <IoFolderOpenOutline />,
      color: '#f87171',
      bg: 'rgba(239,68,68,0.07)',
      border: 'rgba(239,68,68,0.2)',
    },
    {
      id: 'inprogress',
      label: 'In Progress',
      value: progressCount,
      icon: <IoHammerOutline />,
      color: '#fbbf24',
      bg: 'rgba(245,158,11,0.07)',
      border: 'rgba(245,158,11,0.2)',
    },
    {
      id: 'resolved',
      label: 'Resolved',
      value: resolvedCount,
      icon: <IoCheckmarkDoneOutline />,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.07)',
      border: 'rgba(52,211,153,0.2)',
    },
    {
      id: 'closed',
      label: 'Closed',
      value: closedCount,
      icon: <IoCheckmarkCircleOutline />,
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.07)',
      border: 'rgba(148,163,184,0.2)',
    },
    {
      id: 'avgtime',
      label: 'Avg. Resolution',
      value: avgResolutionDays === '—' ? '—' : `${avgResolutionDays}d`,
      icon: <IoTimeOutline />,
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.07)',
      border: 'rgba(96,165,250,0.2)',
    },
  ];

  return (
    <div className="admin-support-page">
      <div className="admin-support-inner animate-fade-in-up">

        {/* Header */}
        <div className="dashboard-top-header">
          <div className="header-left">
            <div className="dashboard-logo-icon">
              <IoAnalyticsOutline />
            </div>
            <div>
              <h1 className="dashboard-title">Complaint Analytics Dashboard</h1>
              <p className="dashboard-subtitle">Live data · {totalIssues} total {totalIssues === 1 ? 'issue' : 'issues'}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="admin-user-avatar">
              {userProfile?.displayName?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </div>

        {/* KPI Stat Cards Row */}
        <div className="kpi-cards-row">
          {kpiCards.map((card) => (
            <div
              key={card.id}
              className="kpi-card"
              style={{
                '--kpi-color': card.color,
                '--kpi-bg': card.bg,
                '--kpi-border': card.border,
              }}
            >
              <div className="kpi-icon-wrap">{card.icon}</div>
              <div className="kpi-info">
                <span className="kpi-value">{card.value}</span>
                <span className="kpi-label">{card.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 3-Column Analytics Charts */}
        <div className="analytics-charts-grid">

          {/* Card 1: Category Breakdown */}
          <div className="analytics-card glass">
            <h3 className="analytics-card-title">Issue Category Breakdown</h3>
            {totalIssues === 0 ? (
              <div className="chart-no-data">No data yet</div>
            ) : (
              <div className="trends-chart-container">
                {categories.map((cat) => (
                  <div className="trend-row" key={cat.label}>
                    <span className="trend-lbl">{cat.label}</span>
                    <div className="trend-bar-wrapper">
                      <div
                        className="trend-bar-fill"
                        style={{
                          width: `${Math.max(cat.value > 0 ? 6 : 0, (cat.value / maxCatVal) * 100)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                    <span className="trend-val">{cat.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Resolution Time (last 6 months) */}
          <div className="analytics-card glass">
            <h3 className="analytics-card-title">
              Avg. Resolution Time
              <span className="chart-subtitle"> (days · last 6 months)</span>
            </h3>
            <div className="spline-chart-container">
              <svg viewBox="0 0 280 100" className="spline-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="curveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#60a5fa" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.00" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line x1="10" y1="25"   x2="270" y2="25"   stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="10" y1="57.5" x2="270" y2="57.5" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="10" y1="90"   x2="270" y2="90"   stroke="var(--border)" strokeWidth="1" />

                {resolvedCount > 0 ? (
                  <>
                    <path d={areaPath} fill="url(#curveAreaGrad)" />
                    <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="1.8" />
                    {resolutionPoints.map((p, i) =>
                      p.hasData ? (
                        <g key={i}>
                          <circle
                            cx={p.x} cy={p.y} r="3.5"
                            fill="var(--bg-secondary)"
                            stroke="#60a5fa"
                            strokeWidth="1.8"
                          />
                          <title>{p.month}: {p.val} days avg</title>
                        </g>
                      ) : null
                    )}
                  </>
                ) : (
                  <text x="140" y="55" textAnchor="middle" fill="var(--text-muted)" fontSize="9">
                    No resolved issues yet
                  </text>
                )}
              </svg>
              <div className="spline-x-axis">
                {last6Months.map((m) => (
                  <span key={`${m.year}-${m.month}`} className="x-lbl">
                    {m.short}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Status Donut */}
          <div className="analytics-card glass">
            <h3 className="analytics-card-title">Status Distribution</h3>
            <div className="pie-chart-wrapper">
              <div className="donut-canvas">
                <svg viewBox="0 0 140 140" className="donut-svg">
                  {totalIssues === 0 ? (
                    <>
                      <circle cx="70" cy="70" r="42" fill="transparent" stroke="var(--bg-elevated)" strokeWidth="12" />
                      <text x="70" y="75" textAnchor="middle" fill="var(--text-muted)" fontSize="8">No data</text>
                    </>
                  ) : (
                    <>
                      {/* Base track */}
                      <circle cx="70" cy="70" r="42" fill="transparent" stroke="#1a1a2e" strokeWidth="12" strokeDasharray="263.8" strokeDashoffset="0" transform="rotate(-90 70 70)" />
                      {/* Open segment */}
                      {pOpen > 0 && (
                        <circle cx="70" cy="70" r="42" fill="transparent" stroke="#ef4444" strokeWidth="12"
                          strokeDasharray={`${(pOpen / 100) * 263.8} 263.8`}
                          strokeDashoffset="0"
                          transform="rotate(-90 70 70)" />
                      )}
                      {/* In Progress segment */}
                      {pProgress > 0 && (
                        <circle cx="70" cy="70" r="42" fill="transparent" stroke="#f59e0b" strokeWidth="12"
                          strokeDasharray={`${(pProgress / 100) * 263.8} 263.8`}
                          strokeDashoffset={-263.8 * (pOpen / 100)}
                          transform="rotate(-90 70 70)" />
                      )}
                      {/* Resolved segment */}
                      {pResolved > 0 && (
                        <circle cx="70" cy="70" r="42" fill="transparent" stroke="#10b981" strokeWidth="12"
                          strokeDasharray={`${(pResolved / 100) * 263.8} 263.8`}
                          strokeDashoffset={-263.8 * ((pOpen + pProgress) / 100)}
                          transform="rotate(-90 70 70)" />
                      )}
                      {/* Closed segment */}
                      {pClosed > 0 && (
                        <circle cx="70" cy="70" r="42" fill="transparent" stroke="#64748b" strokeWidth="12"
                          strokeDasharray={`${(pClosed / 100) * 263.8} 263.8`}
                          strokeDashoffset={-263.8 * ((pOpen + pProgress + pResolved) / 100)}
                          transform="rotate(-90 70 70)" />
                      )}
                      <text x="70" y="67" textAnchor="middle" fill="var(--text-primary)" fontSize="15" fontWeight="700">{totalIssues}</text>
                      <text x="70" y="80" textAnchor="middle" fill="var(--text-tertiary)" fontSize="7.5" fontWeight="600" letterSpacing="0.06em">ISSUES</text>
                    </>
                  )}
                </svg>
              </div>
              <div className="pie-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#ef4444' }} />
                  Open
                  <strong className="legend-pct">{openCount} <span className="legend-pct-paren">({pOpen}%)</span></strong>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#f59e0b' }} />
                  In Progress
                  <strong className="legend-pct">{progressCount} <span className="legend-pct-paren">({pProgress}%)</span></strong>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#10b981' }} />
                  Resolved
                  <strong className="legend-pct">{resolvedCount} <span className="legend-pct-paren">({pResolved}%)</span></strong>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#64748b' }} />
                  Closed
                  <strong className="legend-pct">{closedCount} <span className="legend-pct-paren">({pClosed}%)</span></strong>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Live Workspace: Queue List + Chat Console */}
        <div className="workspace-layout-panel">

          {/* Queue Side */}
          <div className="complaints-queue-side glass">
            <div className="queue-header-box">
              <div className="queue-header-top-row">
                <h3 className="queue-side-title">All Complaints</h3>
                <span className="queue-count-badge">{filteredTickets.length}</span>
              </div>
              <div className="queue-search-control">
                <IoSearchOutline className="search-icon-glass" />
                <input
                  type="text"
                  placeholder="Search by user, subject, category or email..."
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
                    {tab !== 'All' && (
                      <span className="pill-count">
                        {issues.filter((i) => i.status === tab).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="queue-loading-spinner">
                <span className="spinner-glow" />
                <p>Syncing complaints from Firestore...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="queue-empty-prompt">
                <IoChatbubbleEllipsesOutline />
                <p>{totalIssues === 0 ? 'No complaints submitted yet.' : 'No matching complaints found.'}</p>
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
                      <span className="row-user-badge">👤 {ticket.userName || ticket.userEmail || 'Traveler'}</span>
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
                          ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Just now'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Console Side */}
          <div className="chat-console-side glass">
            {selectedTicket ? (
              <div className="console-discussion">

                {/* Console Header */}
                <div className="console-disc-header">
                  <div className="console-user-meta">
                    <span className="console-user-name">👤 {selectedTicket.userName || 'Traveler'}</span>
                    <span className="console-user-email">✉️ {selectedTicket.userEmail || `UID: ${selectedTicket.userId}`}</span>
                    <h2 className="console-disc-title truncate">{selectedTicket.title}</h2>
                  </div>
                  <div className="console-action-badges">
                    <span className={`status-pill pill-${selectedTicket.status.toLowerCase().replace(' ', '-')}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="console-disc-body">

                  {/* Original ticket info */}
                  <div className="console-original-query-card">
                    <span className="original-label">Traveler Ticket — Issue Description</span>
                    <span className="original-category-badge">{getCategoryLabel(selectedTicket.category)}</span>
                    <p className="original-desc-text">{selectedTicket.description}</p>

                    {selectedTicket.createdAt?.seconds && (
                      <span className="original-timestamp">
                        📅 Submitted: {new Date(selectedTicket.createdAt.seconds * 1000).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    )}

                    {selectedTicket.photoUrl && (
                      <div className="original-attachment-wrapper">
                        <img
                          src={selectedTicket.photoUrl}
                          alt="Screenshot upload"
                          className="attachment-thumbnail-img"
                          onClick={() => setLightboxUrl(selectedTicket.photoUrl)}
                        />
                        <span className="attachment-filename-lbl">📷 Attachment (Click to zoom)</span>
                      </div>
                    )}

                    {/* Admin Action Buttons */}
                    <div className="admin-console-actions-row">
                      {selectedTicket.status === 'Open' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<IoHammerOutline />}
                          onClick={handleMarkInProgress}
                          style={{ border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24', background: 'rgba(245,158,11,0.05)', padding: '6px 12px' }}
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
                          style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-secondary)', padding: '6px 12px' }}
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
                          style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-secondary)', padding: '6px 12px' }}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Comments */}
                  {comments.map((comment) =>
                    comment.sender === 'system' ? (
                      <div key={comment.id} className="console-system-msg-badge">
                        <span>⚙️ {comment.text}</span>
                      </div>
                    ) : (
                      <div
                        key={comment.id}
                        className={`console-chat-wrapper ${comment.sender === 'support' ? 'support-bubble-side' : 'user-bubble-side'}`}
                      >
                        <span className="chat-sender-name">
                          {comment.senderName}
                          {comment.sender === 'support' && <span className="staff-badge">Staff</span>}
                        </span>
                        <div className="chat-text-bubble">{comment.text}</div>
                        <span className="chat-timestamp-lbl">
                          {comment.createdAt?.seconds
                            ? new Date(comment.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Sending...'}
                        </span>
                      </div>
                    )
                  )}

                  <div ref={commentsEndRef} />
                </div>

                {/* Reply Footer */}
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
              <div className="console-empty-prompt">
                <IoAlertCircleOutline className="empty-logo-icon" />
                <h3 className="empty-title">Select a traveler query</h3>
                <p className="empty-desc">
                  Pick any complaint from the queue on the left to view full details, manage status, and chat in real-time.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Lightbox */}
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
