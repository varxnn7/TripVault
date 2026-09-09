import {
  IoAirplane,
  IoLocation,
  IoCalendar,
  IoWallet,
  IoCheckmarkCircle,
  IoArrowForward,
  IoRefresh,
  IoListOutline,
} from "react-icons/io5";

const formatTime = (ts) => {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

/**
 * Parse basic markdown from AI response into React-safe elements.
 * Handles: **bold**, bullet lists (- / * / • prefixed lines), newlines.
 */
const parseMarkdown = (text) => {
  if (!text) return null;

  // Split into paragraphs on double newlines
  const paragraphs = text.split(/\n{2,}/);

  return paragraphs.map((para, pi) => {
    const lines = para.split("\n");

    // Check if this paragraph looks like a list
    const isList = lines.every((l) => /^\s*[-*•]\s/.test(l) || l.trim() === "");

    if (isList) {
      return (
        <ul key={pi}>
          {lines
            .filter((l) => l.trim())
            .map((line, li) => {
              const content = line.replace(/^\s*[-*•]\s*/, "");
              return <li key={li}>{applyInline(content)}</li>;
            })}
        </ul>
      );
    }

    // Mixed paragraph
    return (
      <p key={pi} style={{ margin: pi > 0 ? "8px 0 0" : "0" }}>
        {lines.map((line, li) => (
          <span key={li}>
            {applyInline(line)}
            {li < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
};

/**
 * Apply inline formatting: **bold**.
 */
const applyInline = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const ChatMessage = ({
  message,
  userInitial,
  currency = "INR",
  onNavigate,
  onRetrySaveTrip,
}) => {
  const isUser = message.role === "user";
  const { tripAction, tripStatus, tripId } = message;

  return (
    <div className={`chat-msg ${isUser ? "chat-msg-user" : "chat-msg-ai"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="chat-msg-avatar chat-msg-avatar-ai" aria-hidden="true">
          ◆
        </div>
      )}

      {/* Bubble */}
      <div className="chat-bubble">
        <div className="chat-bubble-content">
          {isUser ? message.content : parseMarkdown(message.content)}
        </div>

        {/* ─── Structured Trip Action Card ─── */}
        {tripAction && (
          <div className="chat-trip-card animate-fade-in-up">
            <div className="chat-trip-card-header">
              <span className="chat-trip-badge">
                <IoAirplane /> Trip Ready
              </span>
              {tripStatus === "created" && (
                <span className="chat-trip-status-created">
                  <IoCheckmarkCircle /> In Dashboard
                </span>
              )}
            </div>

            <div className="chat-trip-card-title">
              {tripAction.title || `${tripAction.destination} Adventure`}
            </div>

            {tripAction.destination && (
              <div className="chat-trip-card-dest">
                <IoLocation /> {tripAction.destination}
              </div>
            )}

            <div className="chat-trip-grid">
              {(tripAction.startDate || tripAction.endDate) && (
                <div className="chat-trip-chip">
                  <IoCalendar />
                  <span>
                    {tripAction.startDate || "Upcoming"}
                    {tripAction.endDate ? ` → ${tripAction.endDate}` : ""}
                  </span>
                </div>
              )}

              {tripAction.budget > 0 && (
                <div className="chat-trip-chip">
                  <IoWallet />
                  <span>
                    {currency} {Number(tripAction.budget).toLocaleString()}
                  </span>
                </div>
              )}

              {Array.isArray(tripAction.itinerary) && tripAction.itinerary.length > 0 && (
                <div className="chat-trip-chip">
                  <IoListOutline />
                  <span>{tripAction.itinerary.length} Days Itinerary</span>
                </div>
              )}
            </div>

            {/* Actions & Status */}
            <div className="chat-trip-card-actions">
              {tripStatus === "saving" && (
                <div className="chat-trip-saving">
                  <span className="typing-dot" style={{ width: 6, height: 6 }} />
                  <span>Saving trip & itinerary to dashboard…</span>
                </div>
              )}

              {tripStatus === "created" && tripId && (
                <div className="chat-trip-btn-group">
                  <button
                    className="chat-trip-btn chat-trip-btn-primary"
                    onClick={() => onNavigate && onNavigate(`/trip/${tripId}`)}
                  >
                    <span>View Trip</span>
                    <IoArrowForward />
                  </button>
                  <button
                    className="chat-trip-btn chat-trip-btn-secondary"
                    onClick={() => onNavigate && onNavigate("/dashboard")}
                  >
                    Dashboard
                  </button>
                </div>
              )}

              {tripStatus === "error" && (
                <div className="chat-trip-btn-group">
                  <button
                    className="chat-trip-btn chat-trip-btn-retry"
                    onClick={onRetrySaveTrip}
                  >
                    <IoRefresh />
                    <span>Save to Dashboard</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <span className="chat-bubble-time">{formatTime(message.timestamp)}</span>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="chat-msg-avatar" aria-hidden="true">
          {userInitial || "U"}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
