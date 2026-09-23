// frontend/src/components/ChatWindow.jsx  (customer app)
import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import io from "socket.io-client";
import {
    Phone,
    Video,
    Search,
    MoreVertical,
    ArrowLeft,
    Info,
    CheckSquare,
    BellOff,
    Clock,
    Star,
    Share2,
    X,
    Ban,
    Trash2,
    Eraser,
    BadgeCheck,
    Check,
    ExternalLink,
    Globe,
    Lock,
    CheckCircle,
    XCircle,
} from "lucide-react";
import Message from "./Message";
import InputBox from "./InputBox";
import CallModal from "./CallModel";
import "./ChatWindow.css";

const API =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    (typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "");

const SOCKET_URL = API;
const SUPPORT_API = "https://shyamfoodbackend.onrender.com/api";
const SUPPORT_BASE = SUPPORT_API.replace("/api", "");
const SUPPORT_NAME = "Shyam Food Support";
const SUPPORT_PHONE = "";
const POLL_INTERVAL = 4000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const getImageUrl = (img, base = SUPPORT_BASE) => {
    if (!img) return "";

    if (typeof img === "object") {
        img =
            img.url ||
            img.secure_url ||
            img.path ||
            img.filename ||
            img.fileUrl ||
            img.imageUrl ||
            img.mediaUrl ||
            img.location ||
            "";
    }

    if (!img || typeof img !== "string") return "";

    img = img.trim();

    if (
        img.startsWith("http://") ||
        img.startsWith("https://") ||
        img.startsWith("data:") ||
        img.startsWith("blob:")
    ) {
        return img;
    }

    const cleanBase = base.replace(/\/+$/, "");
    const cleanPath = img.replace(/\\/g, "/").replace(/^\/+/, "");

    return `${cleanBase}/${cleanPath}`;
};

const getStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
        return {};
    }
};

const toUiMessage = (m, userId) => {
    if (!m) return null;

    const mine =
        String(m.senderId || m.userId || "") === String(userId) ||
        m.sender === "customer";

    const resolveMediaUrl = (message) => {
        if (!message) return "";
        const possibleValues = [
            message.image,
            message.imageUrl,
            message.mediaUrl,
            message.url,
            message.fileUrl,
            message.photoUrl,
            message.photo,
            message.media,
            message.attachment,
            message.file,
            message.img,
        ];

        for (const value of possibleValues) {
            if (!value) continue;
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
            if (typeof value === "object") {
                const objectUrl =
                    value.url ||
                    value.secure_url ||
                    value.path ||
                    value.fileUrl ||
                    value.imageUrl ||
                    value.mediaUrl ||
                    value.location ||
                    value.src ||
                    "";
                if (objectUrl) {
                    return objectUrl;
                }
            }
        }
        return "";
    };

    const rawMediaUrl = resolveMediaUrl(m);
    const finalMediaUrl = rawMediaUrl ? getImageUrl(rawMediaUrl, SUPPORT_BASE) : "";

    return {
        id: m._id || m.id,
        _id: m._id || m.id,
        sender: mine ? "user" : "bot",
        senderId: mine ? String(userId) : String(m.senderId || m.userId || "support"),
        text: m.text || m.caption || "",
        type: finalMediaUrl ? "image" : m.type || "text",
        url: finalMediaUrl,
        imageUrl: finalMediaUrl,
        mediaUrl: finalMediaUrl,
        // Original backend value bhi preserve karo
        image: m.image || "",
        timestamp: m.timestamp || m.createdAt || new Date(),
        seen: mine ? m.seenByAdmin || m.read : m.seenByCustomer || m.read,
        delivered: m.delivered !== false,
        replyTo: m.replyTo
            ? {
                ...m.replyTo,
                image: m.replyTo.image || "",
            }
            : null,
        // NEW: promo now carries full product details (price/stock/rating/weight)
        // straight from the backend — spread as-is, nothing to remap here.
        promo: m.promo ? { ...m.promo } : null,
    };
};

const ChatWindow = ({
    userId,
    userName,
    userPhone,
    contact,
    onBack,
    onOpenProfile,
    isDarkMode = false,
    theme,
}) => {
    const darkModeActive = isDarkMode || theme === "dark";
    const navigate = useNavigate();
    const stored = getStoredUser();
    const customerName = userName || stored.name || stored.fullName || "Customer";
    const customerPhone = String(userPhone || stored.phone || stored.mobile || "");

    const [serverMsgs, setServerMsgs] = useState([]);
    const [localMsgs, setLocalMsgs] = useState([]);
    const [clearedAt, setClearedAt] = useState(0);
    const [loading, setLoading] = useState(true);
    const [typing, setTyping] = useState(false);
    const [isContactOnline, setIsContactOnline] = useState(contact?.isOnline || false);
    const [profileData, setProfileData] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [isCalling, setIsCalling] = useState(false);
    const [callType, setCallType] = useState("audio");

    // Dynamic phone fallback resolve
    const activeContactForPhone = profileData ? { ...contact, ...profileData } : contact;
    const displayPhone =
        activeContactForPhone?.phone ||
        activeContactForPhone?.phoneNumber ||
        activeContactForPhone?.mobile ||
        activeContactForPhone?.contactNumber ||
        SUPPORT_PHONE;

    const startAudioCall = () => {
        const phoneNumber = displayPhone;
        if (!phoneNumber) {
            alert("Phone number not available for this contact.");
            return;
        }
        window.location.href = `tel:${phoneNumber}`;
    };

    const [showMenu, setShowMenu] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [disappearingActive, setDisappearingActive] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);

    const endRef = useRef(null);
    const socketRef = useRef(null);
    const contactRef = useRef(contact);
    const lastSigRef = useRef("");

    useEffect(() => {
        contactRef.current = contact;
    }, [contact]);

    useEffect(() => {
        setIsContactOnline(contact?.isOnline || false);
    }, [contact]);

    const clearKey = `support_cleared_${userId}`;
    useEffect(() => {
        try {
            setClearedAt(Number(localStorage.getItem(clearKey)) || 0);
        } catch {
            setClearedAt(0);
        }
    }, [clearKey]);

    const msgs = [
        ...serverMsgs.filter((m) => new Date(m.timestamp).getTime() > clearedAt),
        ...localMsgs,
    ];

    const fetchMessages = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await axios.get(
                `${SUPPORT_API}/support/conversation/${userId}?markSeenBy=customer&customerPhone=${encodeURIComponent(customerPhone)}`
            );

            const mapped = (res.data.data || []).map((m) => toUiMessage(m, userId));
            const sig = mapped
                .map((m) => `${m.id}:${m.seen ? 1 : 0}:${m.url || ""}:${m.text || ""}`)
                .join("|");

            if (sig !== lastSigRef.current) {
                lastSigRef.current = sig;
                setServerMsgs(mapped);
            }
        } catch (error) {
            console.error("Support fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, customerPhone]);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }
        fetchMessages();
        const timer = setInterval(() => {
            if (!document.hidden) fetchMessages();
        }, POLL_INTERVAL);
        return () => clearInterval(timer);
    }, [userId, fetchMessages]);

    // Socket Connection & Real-time Profile Updates
    useEffect(() => {
        if (!userId) return;

        const socket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("register_user", userId);
        });

        socket.on("user_typing", ({ isTyping }) => {
            setTyping(isTyping);
        });

        socket.on("user-online", ({ userId: updatedUserId, isOnline }) => {
            const currentContact = contactRef.current;
            const contactId = currentContact?.id || currentContact?._id;
            if (contactId && String(contactId) === String(updatedUserId)) {
                setIsContactOnline(isOnline);
            }
        });

        socket.on("user_status", (data) => {
            const currentContact = contactRef.current;
            const contactId = currentContact?.id || currentContact?._id;
            if (data && contactId && String(contactId) === String(data.userId)) {
                setIsContactOnline(data.isOnline);
            }
        });

        // Real-time Shopkeeper Name/Phone/Profile update sync
        socket.on("user_updated", (updatedUser) => {
            const currentContact = contactRef.current;
            const contactId = currentContact?.id || currentContact?._id || currentContact?.userId;
            const updatedId = updatedUser?.id || updatedUser?._id || updatedUser?.userId;
            if (contactId && String(contactId) === String(updatedId)) {
                setProfileData((prev) => ({ ...(prev || {}), ...updatedUser }));
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [userId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [serverMsgs, localMsgs, clearedAt, typing]);

    const postToSupport = async ({ text = "", file = null }) => {
        const data = new FormData();
        data.append("userId", userId);
        data.append("sender", "customer");
        data.append("text", text);
        data.append("customerName", customerName);
        data.append("customerPhone", customerPhone);
        if (file) data.append("image", file);
        if (replyingTo) data.append("replyToId", replyingTo.id);

        // FIXED: this was axios.get(url, data) — a GET request never sends a
        // body, so FormData (text/image/replyToId) was silently going nowhere.
        // Sending a message or a photo could never have actually worked.
        const res = await axios.post(`${SUPPORT_API}/support/send`, data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        setReplyingTo(null);
        return toUiMessage(res.data.data, userId);
    };

    const failLocal = (tempId, text) => {
        setLocalMsgs((prev) =>
            prev.map((m) =>
                m.id === tempId
                    ? { id: `error-${Date.now()}`, sender: "bot", text, timestamp: new Date() }
                    : m
            )
        );
    };

    const handleDeleteMessage = async (msgId) => {
        try {
            // Optional deletion logic
        } catch (error) {
            console.error("Failed to delete message on server:", error);
        }
        setServerMsgs((prev) => prev.filter((m) => m.id !== msgId && m._id !== msgId));
        setLocalMsgs((prev) => prev.filter((m) => m.id !== msgId && m._id !== msgId));
    };

    const sendMedia = useCallback(
        async (file, captionText = "") => {
            if (!file || !userId) return;

            const isImage =
                /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/i.test(file.type) ||
                /\.(jpe?g|png|webp|gif)$/i.test(file.name);

            if (!isImage) {
                setLocalMsgs((prev) => [
                    ...prev,
                    {
                        id: `error-${Date.now()}`,
                        sender: "bot",
                        text: "❌ Only JPG, PNG or WebP images can be sent to support.",
                        timestamp: new Date(),
                    },
                ]);
                return;
            }

            if (file.size > MAX_IMAGE_SIZE) {
                setLocalMsgs((prev) => [
                    ...prev,
                    {
                        id: `error-${Date.now()}`,
                        sender: "bot",
                        text: "❌ Image size must not exceed 5 MB.",
                        timestamp: new Date(),
                    },
                ]);
                return;
            }

            const tempId = `uploading-${Date.now()}`;
            setLocalMsgs((prev) => [
                ...prev,
                {
                    id: tempId,
                    sender: "user",
                    senderId: String(userId),
                    type: "media-uploading",
                    text: captionText,
                    fileName: file.name,
                    timestamp: new Date(),
                },
            ]);

            try {
                const saved = await postToSupport({ text: captionText, file });
                setServerMsgs((prev) => [...prev, saved]);
                setLocalMsgs((prev) => prev.filter((m) => m.id !== tempId));
            } catch (error) {
                console.error("Media upload error:", error);
                failLocal(tempId, `❌ ${error?.response?.data?.message || "Media upload failed."}`);
            }
        },
        [userId, customerName, customerPhone, replyingTo]
    );

    const send = useCallback(
        async (text) => {
            const messageText = text?.trim();
            if (!messageText) return;

            if (!userId) {
                setLocalMsgs((prev) => [
                    ...prev,
                    {
                        id: `error-${Date.now()}`,
                        sender: "bot",
                        text: "❌ Please log in to chat with support.",
                        timestamp: new Date(),
                    },
                ]);
                return;
            }

            const tempId = `local-${Date.now()}`;
            setLocalMsgs((prev) => [
                ...prev,
                {
                    id: tempId,
                    sender: "user",
                    senderId: String(userId),
                    text: messageText,
                    timestamp: new Date(),
                },
            ]);

            try {
                const saved = await postToSupport({ text: messageText });
                setServerMsgs((prev) => [...prev, saved]);
                setLocalMsgs((prev) => prev.filter((m) => m.id !== tempId));
            } catch (error) {
                console.error("Failed to send message:", error);
                failLocal(
                    tempId,
                    `❌ ${error?.response?.data?.message || "Failed to send message. Please try again."}`
                );
            }
        },
        [userId, customerName, customerPhone, replyingTo]
    );

    const clearChatLocally = () => {
        const lastServerTs = serverMsgs.length
            ? new Date(serverMsgs[serverMsgs.length - 1].timestamp).getTime()
            : Date.now();
        setClearedAt(lastServerTs);
        setLocalMsgs([]);
        try {
            localStorage.setItem(clearKey, String(lastServerTs));
        } catch {
            // ignore
        }
    };

    const handleClearChat = () => {
        if (window.confirm("Are you sure you want to clear messages?")) {
            clearChatLocally();
            setShowMenu(false);
        }
    };

    const handleDeleteChat = () => {
        if (window.confirm("Are you sure you want to delete this chat?")) {
            clearChatLocally();
            setShowMenu(false);
            onBack?.();
        }
    };

    const handleBlockUser = () => {
        setIsBlocked(!isBlocked);
        setShowMenu(false);
        alert(isBlocked ? "User unblocked" : "User blocked successfully");
    };

    const handleExportChat = () => {
        const chatText = msgs
            .map((m) => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}: ${m.text || "[image]"}`)
            .join("\n");
        const blob = new Blob([chatText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `chat-${activeContact?.name || "support"}.txt`;
        link.click();
        setShowMenu(false);
    };

    // Latest profile fetch from API
    useEffect(() => {
        const fetchLatestProfile = async () => {
            const contactId = contact?._id || contact?.id || contact?.userId;
            if (!contactId || contactId === "store-info" || contact?.role === "store") return;
            try {
                const response = await axios.get(`${API}/api/users/${contactId}`);
                if (response.data) {
                    setProfileData(response.data.user || response.data);
                }
            } catch (error) {
                console.error("Failed to fetch latest profile:", error);
            }
        };
        fetchLatestProfile();
    }, [contact]);

    // Active contact combination with real-time profile data
    const activeContact = profileData ? { ...contact, ...profileData } : contact;

    // Robust Name and Phone fallbacks matching dashboard
    const displayName =
        activeContact?.shopName ||
        activeContact?.businessName ||
        activeContact?.name ||
        activeContact?.fullName ||
        SUPPORT_NAME;

    const rawProfileImg =
        activeContact?.avatar ||
        activeContact?.profilePic ||
        activeContact?.profilePicture ||
        activeContact?.image ||
        activeContact?.logo ||
        activeContact?.photo;

    const profileImageUrl = getImageUrl(rawProfileImg, API);

    const displayedMsgs =
        isSearching && searchQuery.trim()
            ? msgs.filter((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
            : msgs;

    if (!userId) {
        return (
            <div className={`db-chat-window-shell ${darkModeActive ? "dark-theme" : "light-theme"}`}>
                <div className="db-chat-welcome">
                    <span className="db-welcome-emoji">🔒</span>
                    <h3>Please log in</h3>
                    <p>Log in to chat with our support team.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`db-chat-window-shell ${darkModeActive ? "dark-theme" : ""}`}>
            {/* ================= CHAT HEADER ================= */}
            <div className="db-chat-header">
                <button type="button" className="db-chat-back-btn" onClick={onBack} aria-label="Back">
                    <ArrowLeft size={18} />
                </button>
                <div
                    className="db-chat-user-profile"
                    onClick={() => onOpenProfile?.(activeContact)}
                    role="button"
                    tabIndex={0}
                    title="Open Profile"
                >
                    <div className="db-chat-avatar">
                        {profileImageUrl ? (
                            <img
                                src={profileImageUrl}
                                alt={displayName}
                                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                                onError={(e) => {
                                    e.target.style.display = "none";
                                }}
                            />
                        ) : (
                            displayName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="db-chat-user-meta">
                        <h3 className="db-chat-user-name">
                            <span className="store-name-text">{displayName}</span>
                            <BadgeCheck size={16} className="verified-badge" title="Verified Business" />
                        </h3>
                        <div className="db-status-container">
                            {typing ? (
                                <span className="db-typing-status">typing...</span>
                            ) : isContactOnline ? (
                                <span className="db-online-status">
                                    <span className="db-online-dot" />
                                    Online
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="db-chat-actions">
                    <button
                        type="button"
                        className="db-action-icon-btn"
                        title="Audio Call"
                        onClick={startAudioCall}
                    >
                        <Phone size={18} />
                    </button>
                    <button
                        type="button"
                        className="db-action-icon-btn"
                        title="More options"
                        onClick={() => setShowMenu(!showMenu)}
                    >
                        <MoreVertical size={18} />
                    </button>
                    {showMenu && (
                        <div className="db-dropdown-menu">
                            <div
                                className="db-menu-item"
                                onClick={() => {
                                    onOpenProfile?.(activeContact);
                                    setShowMenu(false);
                                }}
                            >
                                <Info size={16} /> Contact info
                            </div>
                            <div
                                className="db-menu-item"
                                onClick={() => {
                                    setIsSearching(true);
                                    setShowMenu(false);
                                }}
                            >
                                <Search size={16} /> Search
                            </div>
                            <div
                                className="db-menu-item"
                                onClick={() => {
                                    alert("Select messages mode enabled");
                                    setShowMenu(false);
                                }}
                            >
                                <CheckSquare size={16} /> Select messages
                            </div>
                            <div
                                className="db-menu-item"
                                onClick={() => {
                                    setIsMuted(!isMuted);
                                    setShowMenu(false);
                                }}
                            >
                                <BellOff size={16} /> {isMuted ? "Unmute notifications" : "Mute notifications"}
                            </div>
                            <div
                                className="db-menu-item"
                                onClick={() => {
                                    setDisappearingActive(!disappearingActive);
                                    setShowMenu(false);
                                    alert(
                                        disappearingActive
                                            ? "Disappearing messages disabled"
                                            : "Disappearing messages enabled (7 days)"
                                    );
                                }}
                            >
                                <Clock size={16} /> Disappearing messages
                            </div>
                            <div
                                className="db-menu-item"
                                onClick={() => {
                                    alert("Added to favourites");
                                    setShowMenu(false);
                                }}
                            >
                                <Star size={16} /> Add to favourites
                            </div>
                            <div className="db-menu-item" onClick={handleExportChat}>
                                <Share2 size={16} /> Export chat
                            </div>
                            <div
                                className="db-menu-item"
                                onClick={() => {
                                    onBack?.();
                                    setShowMenu(false);
                                }}
                            >
                                <X size={16} /> Close chat
                            </div>
                            <div className="db-menu-divider" />
                            <div className="db-menu-item text-danger" onClick={handleBlockUser}>
                                <Ban size={16} /> {isBlocked ? "Unblock" : "Block"}
                            </div>
                            <div className="db-menu-item text-danger" onClick={handleClearChat}>
                                <Eraser size={16} /> Clear chat
                            </div>
                            <div className="db-menu-item text-danger" onClick={handleDeleteChat}>
                                <Trash2 size={16} /> Delete chat
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= SEARCH BAR ================= */}
            {isSearching && (
                <div className="db-chat-search-bar">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setIsSearching(false);
                            setSearchQuery("");
                        }}
                        title="Close Search"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ================= CHAT MESSAGES BODY ================= */}
            <div className="db-chat-messages-area">
                {displayedMsgs.length === 0 && !loading && (
                    <div className="db-chat-welcome">
                        <span className="db-welcome-emoji">👋</span>
                        <h3>{isSearching ? "No messages found" : "Welcome to Dbirds Chat"}</h3>
                        <p>{isSearching ? "Try a different keyword" : "Start messaging"}</p>
                    </div>
                )}

                {displayedMsgs.map((message, index) => (
                    <div key={message.id || message._id || index} className="db-msg-with-reply">
                        {message.promo && (
                            <Link
                                to={message.promo.targetUrl}
                                className="db-promo-link"
                            >
                                {message.promo.image && (
                                    <img
                                        src={getImageUrl(message.promo.image)}
                                        alt=""
                                        className="db-promo-image"
                                        onError={(e) => {
                                            e.target.style.display = "none";
                                        }}
                                    />
                                )}

                                <div className="db-promo-content">
                                    {message.promo.type === "product" && (
                                        <div className="db-promo-stock-row">
                                            {message.promo.quantity === undefined ||
                                                message.promo.quantity === null ||
                                                message.promo.quantity > 0 ? (
                                                <span className="db-promo-in-stock">
                                                    <CheckCircle size={10} /> In Stock
                                                </span>
                                            ) : (
                                                <span className="db-promo-out-stock">
                                                    <XCircle size={10} /> Out of Stock
                                                </span>
                                            )}

                                            {message.promo.visibility && (
                                                <span className="db-promo-visibility">
                                                    {message.promo.visibility !== "private" ? (
                                                        <Globe size={9} />
                                                    ) : (
                                                        <Lock size={9} />
                                                    )}

                                                    {message.promo.visibility !== "private"
                                                        ? "Public"
                                                        : "Private"}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <p className="db-promo-title">
                                        {message.promo.title}

                                        {message.promo.weight && (
                                            <span className="db-promo-weight">
                                                {" "}
                                                {message.promo.weight}
                                                {message.promo.unit || ""}
                                            </span>
                                        )}
                                    </p>

                                    <p className="db-promo-message">
                                        {message.promo.message}
                                    </p>

                                    {message.promo.type === "product" && (
                                        <>
                                            <div className="db-promo-rating">
                                                <span className="db-promo-rating-value">
                                                    {Number(message.promo.rating || 0).toFixed(1)}
                                                </span>

                                                <span>
                                                    ({message.promo.reviews || 0})
                                                </span>

                                                <span>•</span>

                                                <span>
                                                    {message.promo.orders || 0} orders last week
                                                </span>
                                            </div>

                                            <div className="db-promo-price-row">
                                                <span className="db-promo-offer">
                                                    ₹{message.promo.offer}
                                                </span>

                                                {message.promo.price > message.promo.offer && (
                                                    <span className="db-promo-price">
                                                        ₹{message.promo.price}
                                                    </span>
                                                )}

                                                {message.promo.off > 0 && (
                                                    <span className="db-promo-discount">
                                                        {message.promo.off}% OFF
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    <p className="db-promo-open">
                                        <ExternalLink size={11} />
                                        Open
                                    </p>
                                </div>
                            </Link>
                        )}

                        <Message
                            message={message}
                            currentUserId={userId}
                            onReply={(msg) => setReplyingTo(msg)}
                            onDelete={handleDeleteMessage}
                            isDarkMode={isDarkMode}
                        />
                    </div>
                ))}

                {typing && (
                    <div className="db-typing-indicator">
                        <div className="db-typing-dots">
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* ================= REPLY PREVIEW ================= */}
            {replyingTo && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 12px",
                        background: "#f8fafc",
                        borderLeft: "4px solid #f97316",
                        margin: "0 10px",
                        borderRadius: 8,
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#ea580c", margin: 0 }}>
                            Replying to {replyingTo.sender === "user" ? "yourself" : SUPPORT_NAME}
                        </p>
                        <p
                            style={{
                                fontSize: 12,
                                color: "#475569",
                                margin: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {replyingTo.type === "image" ? "📷 Photo" : replyingTo.text}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ================= INPUT BOX ================= */}
            <InputBox onSend={send} onSendMedia={sendMedia} disabled={loading || isBlocked} />

            {/* ================= CALL MODAL ================= */}
            {isCalling && (
                <CallModal contact={contact} callType={callType} onClose={() => setIsCalling(false)} />
            )}
        </div>
    );
};

export default ChatWindow;