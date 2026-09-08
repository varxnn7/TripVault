/**
 * ChatMessage.jsx
 * Renders a single chat message bubble (user or AI).
 * Handles basic markdown formatting for AI responses:
 *   **bold**, bullet lines starting with "- " or "* ", paragraph breaks.
 */

const formatTime = (ts) => {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

/**
 * Parse very basic markdown from AI response into React-safe elements.
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
 * Apply inline formatting: **bold**, _italic_ (optional).
 */
const applyInline = (text) => {
  if (!text) return null;
  // Split on **bold** patterns
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const ChatMessage = ({ message, userInitial }) => {
  const isUser = message.role === "user";

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
          {isUser ? (
            message.content
          ) : (
            parseMarkdown(message.content)
          )}
        </div>
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
