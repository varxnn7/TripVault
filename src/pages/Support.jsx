import { useState, useEffect, useRef } from 'react';
import { 
  IoHelpCircleOutline, 
  IoSend, 
  IoCloudUploadOutline, 
  IoAlertCircleOutline, 
  IoClose, 
  IoTrashOutline, 
  IoChevronDownOutline, 
  IoChatbubbleEllipsesOutline,
  IoImageOutline,
  IoCheckmarkCircleOutline,
  IoRefreshOutline
} from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  createIssue, 
  subscribeToIssues, 
  addIssueComment, 
  subscribeToIssueComments, 
  updateIssueStatus 
} from '../firebase/firestore';
import { uploadIssuePhoto } from '../firebase/storage';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import './Support.css';

const FAQ_ITEMS = [
  {
    q: "How do I change my currency preference?",
    a: "You can change your default currency by clicking on your Profile avatar in the top right, selecting 'Settings', and picking your preferred currency from the Currency Preference panel. Save settings to apply."
  },
  {
    q: "Can I share my itinerary with others?",
    a: "TripVault currently supports single-user planning. We are actively working on a 'Collaborative Trips' feature that will allow you to invite friends to view or edit itineraries with you."
  },
  {
    q: "How do I add a new expense category?",
    a: "When adding an expense inside your trip details, click the category dropdown. You can choose from pre-defined travel categories like Transport, Food, Lodging, and Activities, which keep your spending analytics accurate."
  },
  {
    q: "Is my trip data available offline?",
    a: "TripVault relies on real-time database synchronization to secure your plans. While some elements may be cached by your browser temporarily, an active internet connection is recommended for optimal operation."
  }
];

const Support = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // State variables
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueCategory, setIssueCategory] = useState('bug');
  const [issueDesc, setIssueDesc] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  
  // Custom states
  const [activeFaq, setActiveFaq] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  
  const commentsEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Subscribe to user's issues
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const unsubscribe = subscribeToIssues(user.uid, (data) => {
      setIssues(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Subscribe to comments for selected issue
  useEffect(() => {
    if (!user || !selectedIssue) {
      setComments([]);
      return;
    }
    
    const unsubscribe = subscribeToIssueComments(user.uid, selectedIssue.id, (data) => {
      setComments(data);
    });
    
    return () => unsubscribe();
  }, [user, selectedIssue]);

  // Scroll to bottom of chat when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Synchronize selectedIssue reactively when database changes are pushed
  useEffect(() => {
    if (selectedIssue) {
      const updated = issues.find(i => i.id === selectedIssue.id);
      if (updated && (updated.status !== selectedIssue.status || updated.updatedAt !== selectedIssue.updatedAt)) {
        setSelectedIssue(updated);
      }
    }
  }, [issues, selectedIssue]);

  // Handle selected issue change to load its detailed info
  const handleSelectIssue = (issue) => {
    setSelectedIssue(issue);
  };

  const handleResolveIssue = async () => {
    if (!selectedIssue || !user) return;
    try {
      await updateIssueStatus(user.uid, selectedIssue.id, 'Resolved');
      await addIssueComment(user.uid, selectedIssue.id, {
        text: 'Issue marked as Resolved.',
        sender: 'system',
        senderName: 'System Log',
      });
      addToast('Issue marked as Resolved', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to resolve issue', 'error');
    }
  };

  const handleReopenIssue = async () => {
    if (!selectedIssue || !user) return;
    try {
      await updateIssueStatus(user.uid, selectedIssue.id, 'Open');
      await addIssueComment(user.uid, selectedIssue.id, {
        text: 'Issue reopened.',
        sender: 'system',
        senderName: 'System Log',
      });
      addToast('Issue reopened', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to reopen issue', 'error');
    }
  };

  // Handle Drag & Drop photo upload
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file) => {
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file (PNG, JPG, etc.)', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      addToast('Image size should be less than 5MB', 'error');
      return;
    }

    setAttachmentFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit new issue
  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!issueTitle.trim() || !issueDesc.trim()) return;

    setSubmittingIssue(true);
    try {
      let photoUrl = null;
      if (attachmentFile) {
        setUploadingPhoto(true);
        try {
          photoUrl = await uploadIssuePhoto(user.uid, attachmentFile);
        } catch (uploadErr) {
          console.error('Screenshot upload error:', uploadErr);
          addToast(`Screenshot upload failed: ${uploadErr.message}`, 'error');
          setUploadingPhoto(false);
          setSubmittingIssue(false);
          return; // Stop — don't create the ticket without the screenshot
        }
        setUploadingPhoto(false);
      }

      const issueData = {
        title: issueTitle,
        category: issueCategory,
        description: issueDesc,
        photoUrl,
        userEmail: user.email,
        userName: user.displayName || 'Traveler',
      };

      const newIssueId = await createIssue(user.uid, issueData);
      
      addToast('Issue reported successfully', 'success');
      
      // Reset form
      setIssueTitle('');
      setIssueCategory('bug');
      setIssueDesc('');
      removeAttachment();
      setModalOpen(false);

      // Trigger automatic support assistant reply after 1.5 seconds
      simulateSupportReply(newIssueId, issueCategory, issueTitle);

    } catch (err) {
      console.error(err);
      addToast('Failed to report issue. Please try again.', 'error');
    } finally {
      setSubmittingIssue(false);
    }
  };

  // Simulate support assistant reply to keep the queries discussion live & operational
  const simulateSupportReply = (issueId, category, title) => {
    setTimeout(async () => {
      let replyText = '';
      switch (category) {
        case 'bug':
          replyText = `Hi there! Thank you for reporting the issue: "${title}". I have logged this as a potential bug and forwarded it to our development team. Could you please let us know if you noticed any specific actions leading up to this? We will investigate and post updates right here.`;
          break;
        case 'feature':
          replyText = `Hello! This is a fantastic suggestion! TripVault is constantly improving based on traveler feedback. I've compiled your feedback for our product planning board. We'll update the issue status if we include it in our roadmap!`;
          break;
        case 'expense':
          replyText = `Greetings traveler! Sorry to hear you are having difficulties tracking expenses. Could you verify if your currency parameters are set properly under Settings? Our system supports automatic currency conversions, but let us know if you find errors.`;
          break;
        case 'itinerary':
          replyText = `Hi! Creating seamless itineraries is a priority for TripVault. I'm checking the logs for your trip activities. Let us know if you get a specific error banner, and we will help you debug it immediately.`;
          break;
        default:
          replyText = `Hi traveler! Thank you for reaching out to TripVault Support. We have received your query: "${title}". A triage coordinator has been assigned to review your issue and will get back to you shortly. Feel free to add any details in the thread below.`;
      }

      try {
        // Post support comment
        await addIssueComment(user.uid, issueId, {
          text: replyText,
          sender: 'support',
          senderName: 'Support Assistant',
        });

        // Set status to In Progress
        await updateIssueStatus(user.uid, issueId, 'In Progress');

      } catch (err) {
        console.error("Simulation error:", err);
      }
    }, 1500);
  };

  // Post a text reply/comment on a query thread
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || replying || !selectedIssue) return;

    setReplying(true);
    try {
      await addIssueComment(user.uid, selectedIssue.id, {
        text: replyText,
        sender: 'user',
        senderName: user.displayName || 'Traveler',
      });
      setReplyText('');
    } catch {
      addToast('Failed to post reply', 'error');
    } finally {
      setReplying(false);
    }
  };

  // Toggle FAQ active indices
  const toggleFaq = (index) => {
    if (activeFaq === index) {
      setActiveFaq(null);
    } else {
      setActiveFaq(index);
    }
  };

  // Helper mapping values
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
    <div className="support-page">
      <div className="support-inner animate-fade-in-up">
        {/* Header section */}
        <div className="support-header">
          <div>
            <h1 className="text-h2">Support & Help Hub</h1>
            <p className="support-subtitle">Describe queries, raise issues, and discuss with support specialists.</p>
          </div>
          <Button onClick={() => setModalOpen(true)} icon={<IoHelpCircleOutline />}>
            Report New Issue
          </Button>
        </div>

        {/* Main Workspace Split layout */}
        <div className="support-layout">
          {/* Left panel list */}
          <div className="support-sidebar">
            <h3 className="text-label">Your Queries</h3>
            
            {loading ? (
              <div className="issues-list-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <span className="btn-spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
              </div>
            ) : issues.length === 0 ? (
              <div className="issue-card" style={{ cursor: 'default', pointerEvents: 'none', textAlign: 'center', padding: '32px 16px' }}>
                <IoChatbubbleEllipsesOutline style={{ fontSize: '1.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No issues submitted yet.</p>
              </div>
            ) : (
              <div className="issues-list-container">
                {issues.map((issue) => (
                  <button
                    key={issue.id}
                    className={`issue-card ${selectedIssue?.id === issue.id ? 'active' : ''}`}
                    onClick={() => handleSelectIssue(issue)}
                  >
                    <div className="issue-card-meta">
                      <span className="issue-category-badge">
                        {issue.category === 'bug' ? '🐛' : issue.category === 'feature' ? '✨' : '⚙️'} {issue.category}
                      </span>
                      <span className={`issue-status-badge status-${issue.status.toLowerCase().replace(' ', '-')}`}>
                        {issue.status}
                      </span>
                    </div>
                    <h4 className="issue-card-title truncate">{issue.title}</h4>
                    <p className="issue-card-desc truncate">{issue.description}</p>
                    <span className="issue-card-time">
                      {issue.createdAt?.seconds 
                        ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString()
                        : 'Just now'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel details / discussion */}
          <div className="support-detail glass">
            {selectedIssue ? (
              <div className="issue-discussion">
                {/* Selected Issue Info Header */}
                <div className="discussion-header">
                  <div className="discussion-title-sec">
                    <span className="issue-category-badge discussion-category-badge">
                      {getCategoryLabel(selectedIssue.category)}
                    </span>
                    <h2 className="discussion-title">{selectedIssue.title}</h2>
                    <span className="discussion-time">
                      Reported on {selectedIssue.createdAt?.seconds 
                        ? new Date(selectedIssue.createdAt.seconds * 1000).toLocaleString()
                        : 'Just now'}
                    </span>
                  </div>
                  <div className="discussion-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`issue-status-badge status-${selectedIssue.status.toLowerCase().replace(' ', '-')}`}>
                      {selectedIssue.status}
                    </span>
                    {selectedIssue.status !== 'Resolved' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResolveIssue}
                        icon={<IoCheckmarkCircleOutline />}
                        style={{ border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80', background: 'rgba(34, 197, 94, 0.05)', padding: '6px 12px' }}
                      >
                        Resolve
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReopenIssue}
                        icon={<IoRefreshOutline />}
                        style={{ border: '1px solid rgba(255, 255, 255, 0.2)', color: 'var(--text-secondary)', padding: '6px 12px' }}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>

                {/* Discussion Stream */}
                <div className="discussion-body">
                  {/* Original post body */}
                  <div className="issue-main-post">
                    <span className="issue-main-label">Original Description</span>
                    <p className="issue-main-desc">{selectedIssue.description}</p>
                    
                    {selectedIssue.photoUrl && (
                      <div className="issue-attachment-card">
                        <img 
                          src={selectedIssue.photoUrl} 
                          alt="Issue attachment" 
                          className="issue-attachment-img"
                          onClick={() => setLightboxUrl(selectedIssue.photoUrl)}
                        />
                        <span className="issue-attachment-label">📷 screenshot.png</span>
                      </div>
                    )}
                  </div>

                  {/* Comments feed */}
                  {comments.map((comment) => (
                    comment.sender === 'system' ? (
                      <div key={comment.id} className="system-message-log animate-fade-in" style={{ alignSelf: 'center', margin: '8px 0', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border)', padding: '4px 14px', borderRadius: 'var(--radius-full)' }}>
                        <span className="system-message-text" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.02em' }}>⚙️ {comment.text}</span>
                      </div>
                    ) : (
                      <div 
                        key={comment.id} 
                        className={`message-bubble-wrapper ${comment.sender === 'user' ? 'user-msg' : 'support-msg'}`}
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

                {/* Input form */}
                <form className="discussion-footer" onSubmit={handleSendReply}>
                  <div className="discussion-input-wrapper">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(e);
                        }
                      }}
                      placeholder="Discuss details or post updates..."
                      className="discussion-textarea"
                      rows={2}
                      disabled={replying}
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || replying}
                      className="discussion-send-btn"
                      aria-label="Send message"
                    >
                      <IoSend />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Default view FAQ helper
              <div className="support-detail-empty">
                <IoHelpCircleOutline className="support-empty-icon" />
                <h2 className="support-empty-title">Select a Query</h2>
                <p className="support-empty-desc">
                  Select one of your existing issues from the left side panel to review progress and chat live, or open a new one.
                </p>

                {/* Rich FAQs integration */}
                <div className="faq-section">
                  <h3 className="faq-section-title">Frequently Asked Questions</h3>
                  {FAQ_ITEMS.map((item, index) => (
                    <div 
                      key={index} 
                      className={`faq-item ${activeFaq === index ? 'active' : ''}`}
                    >
                      <button 
                        className="faq-trigger" 
                        onClick={() => toggleFaq(index)}
                      >
                        <span>{item.q}</span>
                        <IoChevronDownOutline className="faq-icon" />
                      </button>
                      <div className="faq-content">
                        <p className="faq-text">{item.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report New Issue Modal Dialog */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          if (!submittingIssue) {
            setModalOpen(false);
            removeAttachment();
          }
        }}
        title="Report an Issue"
        size="md"
      >
        <form onSubmit={handleSubmitIssue} className="support-form-grid">
          <Input
            label="Subject"
            placeholder="Summarize your issue..."
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
            required
            disabled={submittingIssue}
          />

          <div className="category-select-wrapper">
            <label className="category-select-label">Category</label>
            <select
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              className="category-select"
              disabled={submittingIssue}
            >
              <option value="bug">🐛 Bug Report</option>
              <option value="feature">✨ Feature Request</option>
              <option value="expense">💳 Expense Tracker</option>
              <option value="itinerary">✈️ Itinerary Planner</option>
              <option value="general">⚙️ General Inquiry</option>
            </select>
          </div>

          <Input
            label="Description"
            type="textarea"
            placeholder="Tell us what is happening in detail..."
            value={issueDesc}
            onChange={(e) => setIssueDesc(e.target.value)}
            required
            disabled={submittingIssue}
            rows={5}
          />

          {/* Photo/Screenshot upload dropzone */}
          <div className="file-upload-group">
            <span className="file-upload-label">Upload Screenshot / Photo (Optional)</span>
            
            {attachmentPreview ? (
              <div className="image-preview-wrapper">
                <img src={attachmentPreview} alt="Screenshot preview" className="image-preview-img" />
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="image-preview-remove"
                  disabled={submittingIssue}
                >
                  <IoClose />
                </button>
              </div>
            ) : (
              <div
                className={`dropzone-container ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept="image/*"
                  disabled={submittingIssue}
                />
                <IoCloudUploadOutline className="dropzone-icon" />
                <span className="dropzone-text">Drag & drop your screenshot here or <strong style={{ textDecoration: 'underline' }}>browse</strong></span>
                <span className="dropzone-subtext">Supports PNG, JPG, JPEG or WEBP (Max 5MB)</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setModalOpen(false);
                removeAttachment();
              }}
              disabled={submittingIssue}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submittingIssue}
              disabled={!issueTitle.trim() || !issueDesc.trim() || submittingIssue}
            >
              {uploadingPhoto ? 'Uploading screenshot...' : submittingIssue ? 'Submitting...' : 'Submit Issue'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lightbox zoom overlay */}
      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl('')}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxUrl('')}>
              <IoClose />
            </button>
            <img src={lightboxUrl} alt="Enlarged preview" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
