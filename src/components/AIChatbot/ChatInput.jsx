/**
 * ChatInput.jsx
 * Text input + send button for the AI chatbot.
 * - Enter = send, Shift+Enter = newline
 * - Disabled while AI is loading
 * - Auto-resizes textarea up to max-height (controlled by CSS)
 * - Character counter near limit
 */

import { useState, useRef, useEffect } from "react";
import { IoSend } from "react-icons/io5";

const MAX_LENGTH = 2000;
const WARN_THRESHOLD = 1800;

const ChatInput = ({ onSend, disabled }) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  // Auto-resize textarea height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const remaining = MAX_LENGTH - value.length;
  const nearLimit = value.length >= WARN_THRESHOLD;

  return (
    <div>
      <div className="chat-input-area">
        <textarea
          ref={textareaRef}
          className="chat-input-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Ask TripVault AI…"
          disabled={disabled}
          rows={1}
          aria-label="Chat message input"
          aria-multiline="true"
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          title="Send (Enter)"
        >
          <IoSend />
        </button>
      </div>
      {nearLimit && (
        <p className="chat-input-hint" style={{ color: remaining < 100 ? "var(--danger)" : "var(--text-muted)" }}>
          {remaining} characters remaining
        </p>
      )}
      {!nearLimit && (
        <p className="chat-input-hint">Enter to send · Shift+Enter for new line</p>
      )}
    </div>
  );
};

export default ChatInput;
