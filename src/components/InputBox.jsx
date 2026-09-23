// frontend/src/components/InputBox.jsx
import React, { useState, useRef } from "react";
import { Paperclip, Smile, Send, Mic } from "lucide-react";
import "./InputBox.css";

const InputBox = ({ onSend, onSendMedia, disabled }) => {
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // WhatsApp-style popular emojis
  const emojis = [
    "😀", "😂", "😍", "👍", "🙏", "❤️", "🔥", "✨",
    "😊", "😎", "🥳", "😭", "🎉", "👏", "🙌", "💡",
    "🚀", "💻", "📞", "📦", "📍", "⏰", "✅", "❌"
  ];

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji) => {
    setText((prev) => prev + emoji);
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = "hi-IN"; // Supports Hindi, Hinglish, and English
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const transcriptText = finalTranscript || interimTranscript;
        if (transcriptText) {
          setText((prev) => (prev ? `${prev} ${transcriptText}` : transcriptText));
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      console.error("Speech start error:", error);
      setIsListening(false);
    }
  };

 const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
   
      onSendMedia(file, text); 
      setText(""); // Text bhejne ke baad input clear kar dein
      setShowEmojiPicker(false);
      e.target.value = null;
    }
  };

  return (
    <div className="db-input-box-wrapper">
      {/* Emoji Picker Popup Container */}
      {showEmojiPicker && (
        <div className="db-emoji-picker-dropdown">
          <div className="db-emoji-grid">
            {emojis.map((emoji, index) => (
              <button
                key={index}
                type="button"
                className="db-emoji-btn"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="db-input-box-form" onSubmit={handleSend}>
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />

        {/* WhatsApp Style Single Unified Pill Container */}
        <div className="db-input-pill-container">
          {/* Attach / Paperclip Button */}
          <button
            type="button"
            className="db-inline-icon-btn db-attach-trigger"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Media / Gallery"
          >
            <Paperclip size={19} />
          </button>

          {/* Emoji Trigger Button */}
          <button
            type="button"
            className="db-inline-icon-btn db-emoji-trigger"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Emoji"
          >
            <Smile size={19} />
          </button>

          <input
            type="text"
            className="db-message-input"
            placeholder={isListening ? "Listening... Speak now 🎙️" : "Type a message"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
          />

          {text.trim() ? (
            /* Send Button */
            <button type="submit" className="db-inline-icon-btn db-send-action-btn" disabled={disabled} title="Send">
              <Send size={17} />
            </button>
          ) : (
            /* Microphone Button */
            <button
              type="button"
              className={`db-inline-icon-btn db-mic-trigger ${isListening ? "db-listening" : ""}`}
              onClick={toggleVoiceInput}
              title="Voice Message"
            >
              <Mic size={19} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default InputBox;