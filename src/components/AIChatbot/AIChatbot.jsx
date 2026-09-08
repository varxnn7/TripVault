/**
 * AIChatbot.jsx
 * Root chatbot component — floating button + chat window controller.
 *
 * - Only renders for authenticated non-admin users
 * - Shows a small "ping" indicator on first load to draw attention
 * - Manages open/closed state
 * - Keyboard accessible (Escape closes window via ChatWindow)
 */

import { useState, useEffect } from "react";
import { IoChatbubbleEllipses, IoClose } from "react-icons/io5";
import { useAuth } from "../../contexts/AuthContext";
import ChatWindow from "./ChatWindow";
import "./aiChatbot.css";

const AIChatbot = () => {
  const { user, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showPing, setShowPing] = useState(false);

  // Show ping animation after a short delay on first mount (draw attention)
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => setShowPing(true), 1500);
    // Hide ping after 3 cycles (~8 seconds)
    const hideTimer = setTimeout(() => setShowPing(false), 9500);
    return () => { clearTimeout(timer); clearTimeout(hideTimer); };
  }, [user]);

  // Hide ping once user opens the chatbot
  const handleOpen = () => {
    setIsOpen(true);
    setShowPing(false);
  };

  // Don't render for unauthenticated users or admin users
  if (!user || userProfile?.role === "admin") return null;

  return (
    <>
      {/* Chat Window — rendered above the button */}
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}

      {/* Floating Action Button */}
      <div className="chatbot-fab-wrapper">
        <button
          className={`chatbot-fab ${isOpen ? "chatbot-fab-active" : ""}`}
          onClick={isOpen ? () => setIsOpen(false) : handleOpen}
          aria-label={isOpen ? "Close TripVault AI" : "Open TripVault AI"}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          title="TripVault AI"
        >
          {isOpen ? <IoClose /> : <IoChatbubbleEllipses />}
          {showPing && !isOpen && <span className="chatbot-fab-ping" aria-hidden="true" />}
        </button>
      </div>
    </>
  );
};

export default AIChatbot;
