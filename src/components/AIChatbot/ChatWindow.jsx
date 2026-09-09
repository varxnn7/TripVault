import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IoClose, IoWarning, IoTrashOutline } from "react-icons/io5";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { sendMessage as aiSendMessage } from "../../services/aiService";
import { createTrip, addItineraryDay, addPackingItem } from "../../firebase/firestore";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

const SUGGESTED_PROMPTS = [
  { icon: "✈️", text: "Plan a 4-day trip to Manali with budget ₹20,000" },
  { icon: "🏖️", text: "Create a 3-day beach trip to Goa" },
  { icon: "💰", text: "Analyze my trip expenses" },
  { icon: "🗺️", text: "Show me my itinerary" },
  { icon: "🎒", text: "What should I pack for my next trip?" },
  { icon: "❄️", text: "Top places to visit in Shimla?" },
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
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Load chat history from localStorage keyed by user UID
  const [messages, setMessages] = useState(() => {
    if (!user?.uid) return [];
    try {
      const saved = localStorage.getItem(`tripvault_ai_chat_${user.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed loading chat history:", e);
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUserMessage, setLastUserMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const windowRef = useRef(null);

  const userInitial = (user?.displayName || user?.email || "U")[0].toUpperCase();

  // Persist chat history to localStorage whenever messages change
  useEffect(() => {
    if (!user?.uid) return;
    try {
      if (messages.length > 0) {
        localStorage.setItem(`tripvault_ai_chat_${user.uid}`, JSON.stringify(messages));
      } else {
        localStorage.removeItem(`tripvault_ai_chat_${user.uid}`);
      }
    } catch (e) {
      console.warn("Failed persisting chat history:", e);
    }
  }, [messages, user?.uid]);

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

  const handleClearChat = () => {
    if (window.confirm("Start a new conversation? This will clear your chat history.")) {
      setMessages([]);
      setError(null);
      if (user?.uid) {
        localStorage.removeItem(`tripvault_ai_chat_${user.uid}`);
      }
      addToast("Chat history cleared", "info", 2000);
    }
  };

  // Execute trip creation in Firestore
  const executeCreateTrip = async (tripAction) => {
    if (!user?.uid || !tripAction) return null;

    const newTripId = await createTrip(user.uid, {
      title: tripAction.title || (tripAction.destination ? `${tripAction.destination} Trip` : "New Adventure"),
      destination: tripAction.destination || "Not specified",
      startDate: tripAction.startDate ? new Date(tripAction.startDate) : null,
      endDate: tripAction.endDate ? new Date(tripAction.endDate) : null,
      budget: Number(tripAction.budget) || 0,
      description: tripAction.description || "",
      status: "planning",
      coverPhoto: "",
      sharedWith: [],
    });

    // Populate daily itinerary
    if (Array.isArray(tripAction.itinerary) && tripAction.itinerary.length > 0) {
      for (let idx = 0; idx < tripAction.itinerary.length; idx++) {
        const day = tripAction.itinerary[idx];
        await addItineraryDay(user.uid, newTripId, {
          dayNumber: Number(day.dayNumber) || (idx + 1),
          title: day.title || `Day ${day.dayNumber || idx + 1}`,
          date: day.date ? new Date(day.date) : null,
          activities: Array.isArray(day.activities)
            ? day.activities.map((a) => ({
                time: a.time || "",
                title: a.title || "Activity",
                location: a.location || "",
                notes: a.notes || "",
              }))
            : [],
        });
      }
    }

    // Populate packing list
    if (Array.isArray(tripAction.packing) && tripAction.packing.length > 0) {
      for (const item of tripAction.packing) {
        await addPackingItem(user.uid, newTripId, {
          name: typeof item === "string" ? item : item.name || "Item",
          category: typeof item === "object" && item.category ? item.category : "General",
        });
      }
    }

    return newTripId;
  };

  const handleSend = async (text) => {
    if (loading) return;

    const userMsg = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);
    setLastUserMessage(text);

    try {
      // Pass conversation history to the service
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
        rawText: m.rawText,
      }));

      const aiResponse = await aiSendMessage(
        user.uid,
        userProfile,
        text,
        history.slice(0, -1) // exclude current message (service appends it)
      );

      const content = typeof aiResponse === "string" ? aiResponse : aiResponse.text;
      const rawText = typeof aiResponse === "string" ? aiResponse : aiResponse.rawText;
      const tripAction = typeof aiResponse === "object" ? aiResponse.tripAction : null;

      const aiMsg = {
        role: "assistant",
        content,
        rawText,
        timestamp: Date.now(),
        tripAction: tripAction || null,
        tripStatus: tripAction ? "saving" : null,
        tripId: null,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If AI generated a trip action, immediately save it to Firestore!
      if (tripAction) {
        try {
          const createdTripId = await executeCreateTrip(tripAction);
          setMessages((prev) =>
            prev.map((m) =>
              m.timestamp === aiMsg.timestamp && m.role === "assistant"
                ? { ...m, tripStatus: "created", tripId: createdTripId }
                : m
            )
          );
          addToast(
            `🎉 Trip "${tripAction.title || tripAction.destination}" created in your dashboard!`,
            "success",
            4000
          );
        } catch (saveErr) {
          console.error("Error auto-creating trip from AI:", saveErr);
          setMessages((prev) =>
            prev.map((m) =>
              m.timestamp === aiMsg.timestamp && m.role === "assistant"
                ? { ...m, tripStatus: "error", tripError: "Could not save trip to database." }
                : m
            )
          );
          addToast("Failed to save trip to dashboard. Click retry on the card.", "error");
        }
      }
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

  const handleRetrySaveTrip = async (msgTimestamp, tripAction) => {
    try {
      setMessages((prev) =>
        prev.map((m) =>
          m.timestamp === msgTimestamp ? { ...m, tripStatus: "saving" } : m
        )
      );
      const createdTripId = await executeCreateTrip(tripAction);
      setMessages((prev) =>
        prev.map((m) =>
          m.timestamp === msgTimestamp
            ? { ...m, tripStatus: "created", tripId: createdTripId }
            : m
        )
      );
      addToast(`🎉 Trip "${tripAction.title || tripAction.destination}" created!`, "success");
    } catch (err) {
      console.error("Retry trip save failed:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.timestamp === msgTimestamp
            ? { ...m, tripStatus: "error", tripError: "Failed to save." }
            : m
        )
      );
      addToast("Failed to save trip.", "error");
    }
  };

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
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
        <div className="chat-header-actions">
          {messages.length > 0 && (
            <button
              className="chat-action-btn"
              onClick={handleClearChat}
              aria-label="Clear chat history"
              title="Clear conversation"
            >
              <IoTrashOutline />
            </button>
          )}
          <button
            className="chat-close-btn"
            onClick={onClose}
            aria-label="Close AI assistant"
            title="Close (Esc)"
          >
            <IoClose />
          </button>
        </div>
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
              Ask me to plan & create trips, calculate budgets, or build custom itineraries.
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
            <ChatMessage
              key={i}
              message={msg}
              userInitial={userInitial}
              currency={userProfile?.currency || "INR"}
              onNavigate={handleNavigate}
              onRetrySaveTrip={() => handleRetrySaveTrip(msg.timestamp, msg.tripAction)}
            />
          ))
        )}

        {/* Typing indicator */}
        {loading && <TypingIndicator />}

        {/* Error banner */}
        {error && <ErrorBanner text={error} onRetry={handleRetry} />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────── */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
};

export default ChatWindow;
