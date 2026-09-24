// frontend/src/components/Message.jsx

import React, { useState, useRef, useEffect } from "react";
import {
  Check,
  CheckCheck,
  Clock,
  Smile,
  Reply,
  Trash2,
  Copy,
} from "lucide-react";
import "./Message.css";

const BASE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    process.env?.REACT_APP_API_URL) ||
  (typeof window !== "undefined" &&
    window.location.hostname === "localhost"
    ? "https://dtalkbackend.designerbrids.com"
    : "");

const SUPPORT_BASE_URL = "https://backend.shyamnamkeenandbakers.online/api";

const Message = ({
  message,
  currentUserId,
  onReply,
  onReact,
  onDelete,
  isDarkMode,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef(null);

  // Safety check
  if (!message) {
    return null;
  }

  const {
    _id,
    id,
    sender,
    senderId,
    text,
    type,
    url,
    imageUrl,
    mediaUrl: directMediaUrl,
    image,
    fileName,
    timestamp,
    status,
    read,
    delivered,
    replyTo,
    reactions = [],
  } = message;

  // --------------------------------------------------
  // MESSAGE ID
  // --------------------------------------------------

  const msgId = _id || id;

  // --------------------------------------------------
  // CHECK IF MESSAGE BELONGS TO CURRENT USER
  // --------------------------------------------------

  const senderIdentifier = senderId || sender;

  const isMe = currentUserId
    ? String(senderIdentifier) === String(currentUserId)
    : sender === "user";

  // --------------------------------------------------
  // MESSAGE TIME
  // --------------------------------------------------

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    : "";

  // --------------------------------------------------
  // RESOLVE IMAGE / MEDIA VALUE
  // --------------------------------------------------

  const resolveImageValue = (val) => {
    if (!val) {
      return "";
    }

    // String
    if (typeof val === "string") {
      return val;
    }

    // Array
    if (Array.isArray(val)) {
      const firstValidValue = val.find(Boolean);

      return resolveImageValue(firstValidValue);
    }

    // Object
    if (typeof val === "object") {
      return (
        val.url ||
        val.secure_url ||
        val.path ||
        val.fileUrl ||
        val.imageUrl ||
        val.mediaUrl ||
        val.filename ||
        val.location ||
        val.src ||
        ""
      );
    }

    return "";
  };

  // --------------------------------------------------
  // BUILD MEDIA URL
  // --------------------------------------------------



  const getMediaUrl = (value) => {
    if (!value) return "";

    if (typeof value === "object") {
      value =
        value.url ||
        value.secure_url ||
        value.path ||
        value.fileUrl ||
        value.imageUrl ||
        value.mediaUrl ||
        value.location ||
        value.src ||
        "";
    }

    if (!value) return "";

    const stringValue = String(value).trim();

    if (
      stringValue.startsWith("http://") ||
      stringValue.startsWith("https://") ||
      stringValue.startsWith("blob:") ||
      stringValue.startsWith("data:")
    ) {
      return stringValue;
    }

    return `${SUPPORT_BASE_URL}/${stringValue
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")}`;
  };

  // --------------------------------------------------
  // FIND IMAGE FROM ALL POSSIBLE FIELDS
  // --------------------------------------------------

  const finalImageSource = resolveImageValue(
    url ||
    imageUrl ||
    directMediaUrl ||
    image ||
    message?.media ||
    message?.file ||
    message?.attachment ||
    message?.fileUrl ||
    message?.photo ||
    message?.photoUrl
  );

  const mediaUrl = getMediaUrl(finalImageSource);

  // --------------------------------------------------
  // DEBUG
  // --------------------------------------------------

  console.log("📩 MESSAGE:", message);

  console.log("🖼️ MEDIA DEBUG:", {
    type: message?.type,
    text: message?.text,

    url: message?.url,
    imageUrl: message?.imageUrl,
    mediaUrl: message?.mediaUrl,
    image: message?.image,

    media: message?.media,
    file: message?.file,
    attachment: message?.attachment,

    fileUrl: message?.fileUrl,
    photo: message?.photo,
    photoUrl: message?.photoUrl,

    finalImageSource,
    mediaUrl,
  });

  // --------------------------------------------------
  // DOCUMENT OPEN
  // --------------------------------------------------

  const handleDocOpen = () => {
    if (!mediaUrl) {
      return;
    }

    window.open(
      mediaUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // --------------------------------------------------
  // CLOSE MENU OUTSIDE CLICK
  // --------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowMenu(false);
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // --------------------------------------------------
  // COPY MESSAGE
  // --------------------------------------------------

  const handleCopy = () => {
    if (text) {
      navigator.clipboard.writeText(text);
    }

    setShowMenu(false);
  };

  // --------------------------------------------------
  // MESSAGE TICKS
  // --------------------------------------------------

  const renderTicks = () => {
    if (!isMe) {
      return null;
    }

    const isRead =
      read ||
      message.seen ||
      status === "read";

    const isDelivered =
      delivered ||
      status === "delivered" ||
      isRead;

    const isSending =
      status === "sending" ||
      (!status && !timestamp);

    if (isSending) {
      return (
        <Clock
          size={13}
          className="msg-tick tick-pending"
        />
      );
    }

    if (isRead) {
      return (
        <CheckCheck
          size={14}
          className="msg-tick tick-read"
          style={{ color: "#34b7f1" }}
        />
      );
    }

    if (isDelivered) {
      return (
        <CheckCheck
          size={14}
          className="msg-tick tick-delivered"
        />
      );
    }

    return (
      <Check
        size={14}
        className="msg-tick tick-sent"
      />
    );
  };

  // --------------------------------------------------
  // RENDER MESSAGE CONTENT
  // --------------------------------------------------

  const renderContent = () => {
    // ----------------------------------------------
    // IMAGE
    // ----------------------------------------------

    const isImageMessage =
      type === "image" ||
      type === "image-with-text" ||
      type === "photo" ||
      Boolean(mediaUrl);

    if (isImageMessage) {
      return (
        <div className="media-with-caption">
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt={fileName || "Image"}
              className="media-img"
              onError={(event) => {
                console.error("❌ IMAGE LOAD FAILED:", event.currentTarget.src);

                console.error(
                  "❌ FULL MESSAGE:",
                  message
                );

                event.currentTarget.style.display =
                  "none";
              }}
            />
          ) : (
            <div
              style={{
                color: "red",
                fontSize: "12px",
                padding: "5px",
              }}
            >
              ❌ Image URL not found
            </div>
          )}

          {text && (
            <div className="image-caption-text">
              {text}
            </div>
          )}
        </div>
      );
    }

    // ----------------------------------------------
    // VIDEO
    // ----------------------------------------------

    switch (type) {
      case "video":
        return (
          <video
            src={mediaUrl}
            controls
            className="media-video"
          />
        );

      // --------------------------------------------
      // AUDIO
      // --------------------------------------------

      case "audio":
        return (
          <audio
            src={mediaUrl}
            controls
            className="media-audio"
          />
        );

      // --------------------------------------------
      // DOCUMENT
      // --------------------------------------------

      case "document":
      case "file":
        return (
          <button
            type="button"
            className="media-doc"
            onClick={handleDocOpen}
          >
            📄 {fileName || "Document"}
          </button>
        );

      // --------------------------------------------
      // MEDIA UPLOADING
      // --------------------------------------------

      case "media-uploading":
        return (
          <div className="media-with-caption">
            {mediaUrl && (
              <img
                src={mediaUrl}
                alt="Uploading preview"
                className="media-img"
                style={{ opacity: 0.7 }}
              />
            )}

            <span className="uploading-text">
              ⏳ Uploading{" "}
              {fileName || "image"}...
            </span>

            {text && (
              <div className="image-caption-text">
                {text}
              </div>
            )}
          </div>
        );

      // --------------------------------------------
      // NORMAL TEXT
      // --------------------------------------------

      default:
        return <span className="message-text">{text}</span>;
    }
  };

  // --------------------------------------------------
  // RETURN
  // --------------------------------------------------

  return (
    <div
      className={`msg ${isMe ? "user-msg" : "other-msg"
        } ${isDarkMode ? "dark-theme" : ""
        }`}
      ref={menuRef}
    >
      <div
        className={`bubble ${isMe
          ? "bubble-user"
          : "bubble-other"
          }`}
        onClick={() => {
          setShowMenu(!showMenu);
          setShowEmojiPicker(false);
        }}
        style={{ cursor: "pointer" }}
      >
        {/* REPLY PREVIEW */}

        {replyTo && (
          <div className="msg-reply-preview">
            <span className="reply-preview-sender">
              {replyTo.sender || "Reply"}
            </span>

            <span className="reply-preview-text">
              {replyTo.text ||
                (resolveImageValue(
                  replyTo.image ||
                  replyTo.url ||
                  replyTo.imageUrl ||
                  replyTo.mediaUrl
                )
                  ? "📷 Photo"
                  : "") ||
                (replyTo.type
                  ? `[${replyTo.type}]`
                  : "")}
            </span>
          </div>
        )}

        {/* MESSAGE CONTENT */}

        <div className="bubble-content-row">
          {renderContent()}

          <span className="msg-meta">
            <span className="msg-time">
              {time}
            </span>

            {renderTicks()}
          </span>
        </div>

        {/* REACTIONS */}

        {reactions.length > 0 && (
          <div className="msg-reactions-list">
            {reactions.map((reaction, index) => (
              <span
                key={index}
                className="reaction-badge"
              >
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* EMOJI PICKER */}

      {showEmojiPicker && (
        <div className="emoji-picker-popup">
          {[
            "❤️",
            "👍",
            "😂",
            "😮",
            "😢",
            "🙏",
          ].map((emoji) => (
            <span
              key={emoji}
              onClick={() => {
                if (onReact) {
                  onReact(msgId, emoji);
                }

                setShowEmojiPicker(false);
              }}
              style={{
                cursor: "pointer",
                fontSize: "20px",
                margin: "0 4px",
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* CONTEXT MENU */}

      {showMenu && (
        <div className="whatsapp-context-menu">
          {onReply && (
            <div
              onClick={(event) => {
                event.stopPropagation();

                onReply(message);

                setShowMenu(false);
              }}
            >
              <Reply size={16} />
              Reply
            </div>
          )}

          {text && (
            <div
              onClick={(event) => {
                event.stopPropagation();

                handleCopy();
              }}
            >
              <Copy size={16} />
              Copy
            </div>
          )}

          {onReact && (
            <div
              onClick={(event) => {
                event.stopPropagation();

                setShowEmojiPicker(true);
                setShowMenu(false);
              }}
            >
              <Smile size={16} />
              React
            </div>
          )}

          {onDelete && isMe && (
            <div
              className="menu-danger"
              onClick={(event) => {
                event.stopPropagation();

                onDelete(msgId);

                setShowMenu(false);
              }}
            >
              <Trash2 size={16} />
              Delete
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Message;