/**
 * ChatWindow.jsx
 * The main chat panel — manages all message state for the current session.
 *
 * State lives in React only (no Firestore persistence in V1).
 * History is designed to be easily connected to Firestore later.
 *
 * Flow:
 *   User types → ChatInput.onSend → handleSend →
 *   aiService.sendMessage(uid, profile, text, history) →
 *   AI response → update messages state → auto-scroll
 */

import { useState, useEffect, useRef } from "react";
import { IoClose, IoWarning } from "react-icons/io5";
import { useAuth } from "../../contexts/AuthContext";
import { sendMessage as aiSendMessage } from "../../services/aiService";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

const SUGGESTED_PROMPTS = [
  { icon: "✈️", text: "What is my upcoming trip?" },
  { icon: "💰", text: "Analyze my trip expenses" },
  { icon: "🗺️", text: "Show me my itinerary" },
  { icon: "🎒", text: "What should I pack for my next trip?" },
  { icon: "🏖️", text: "Plan a 3-day trip to Goa" },
  { icon: "❄️", text: "Best places to visit in Manali?" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="chat-typing">
    <div className="chat-msg-avatar chat-msg-avatar-ai" aria-hidden="true">◆</div>
    <div className="chat-typing-bubble" aria-label="TripVault AI is thinking">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  </div>
);

const ErrorBanner = ({ text, onRetry }) => (
  <div className="chat-error" role="alert">
    <IoWarning className="chat-error-icon" />
    <span className="chat-error-text">{text}</span>
    {onRetry && (
      <button className="chat-error-retry" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ChatWindow = ({ onClose }) => {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUserMessage, setLastUserMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const windowRef = useRef(null);

  const userInitial = (user?.displayName || user?.email || "U")[0].toUpperCase();

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSend = async (text) => {
    if (loading) return;

    const userMsg = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);
    setLastUserMessage(text);

    try {
      // Pass conversation history (roles only, no timestamps) to the service
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const responseText = await aiSendMessage(
        user.uid,
        userProfile,
        text,
        history.slice(0, -1) // exclude the current message (service appends it)
      );

      const aiMsg = {
        role: "assistant",
        content: responseText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      setError(null);
      handleSend(lastUserMessage);
    }
  };

  return (
    <div
      className="chat-window"
      ref={windowRef}
      role="dialog"
      aria-label="TripVault AI Assistant"
      aria-modal="true"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-header-logo" aria-hidden="true">◆</div>
          <div>
            <div className="chat-header-title">TripVault AI</div>
            <div className="chat-header-status">
              <span className={`chat-status-dot ${loading ? "thinking" : ""}`} />
              {loading ? "Thinking…" : "Online"}
            </div>
          </div>
        </div>
        <button
          className="chat-close-btn"
          onClick={onClose}
          aria-label="Close AI assistant"
          title="Close (Esc)"
        >
          <IoClose />
        </button>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 && !loading ? (
          /* Welcome / empty state */
          <div className="chat-empty">
            <div className="chat-empty-logo" aria-hidden="true">◆</div>
            <p className="chat-empty-title">
              Hi {userProfile?.displayName?.split(" ")[0] || "there"}! 👋
            </p>
            <p className="chat-empty-subtitle">
              Ask me anything about your trips, expenses, or travel plans.
            </p>
            <div className="chat-suggestions">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p.text}
                  className="chat-suggestion-btn"
                  onClick={() => handleSend(p.text)}
                  disabled={loading}
                >
                  <span className="chat-suggestion-icon">{p.icon}</span>
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} userInitial={userInitial} />
          ))
        )}

        {/* Typing indicator */}
        {loading && <TypingIndicator />}

        {/* Error banner */}
        {error && <ErrorBanner text={error} onRetry={handleRetry} />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
};

export default ChatWindow;
