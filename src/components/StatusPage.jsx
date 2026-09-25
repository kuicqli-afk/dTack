// frontend/src/components/StatusPage.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./StatusPage.css";

const API = "https://dtalkbusiness.designerbrids.com";

const StatusPage = ({ userId, theme = "dark" }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingUser, setViewingUser] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Viewer controls state
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showViewsDrawer, setShowViewsDrawer] = useState(false);

  // Profile & Upload states
  const [localUserName, setLocalUserName] = useState(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) return parsed.name;
      } catch (e) { }
    }
    return localStorage.getItem("userName") || "User";
  });

  const [localUserAvatar, setLocalUserAvatar] = useState(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.avatar) return parsed.avatar;
      } catch (e) { }
    }
    return localStorage.getItem("userAvatar") || "";
  });

  const videoRef = useRef(null); // Fixed typo from vedioRef

  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [type, setType] = useState("text");
  const [bgColor, setBgColor] = useState("#075e54");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentUserId = userId || localStorage.getItem("userId");

  // Sync live profile updates
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e.detail) {
        if (e.detail.name) setLocalUserName(e.detail.name);
        if (e.detail.avatar !== undefined) setLocalUserAvatar(e.detail.avatar);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  const fetchStatuses = async () => {
    try {
      const response = await axios.get(`${API}/api/status/feed`);
      if (response.data?.success) {
        setFeed(response.data.feed || []);
      }
    } catch (error) {
      console.error("Error fetching status feed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
      const interval = setInterval(fetchStatuses, 5 * 60 * 1000); // har 5 minute mein refresh
  return () => clearInterval(interval);
  }, []);

  // Handle Story Progress Timer (Pauses if isPaused or views drawer is open)
  useEffect(() => {
    if (!viewingUser || isPaused || showViewsDrawer) return;
    const currentStatus = viewingUser?.statuses[currentStatusIndex];
    if (currentStatus?.type === "video") return;

    const interval = 50;
    const duration = 5000;
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timerRef.current);
          handleNextStatus();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [viewingUser, currentStatusIndex, isPaused, showViewsDrawer]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => { });
      }
    }
  }, [isPaused, currentStatusIndex, viewingUser]);

  const handleNextStatus = () => {
    if (!viewingUser) return;
    setShowMenu(false);
    setShowViewsDrawer(false);
    if (currentStatusIndex < viewingUser.statuses.length - 1) {
      setCurrentStatusIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      setViewingUser(null);
      setCurrentStatusIndex(0);
    }
  };

  const handlePrevStatus = () => {
    setShowMenu(false);
    setShowViewsDrawer(false);
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  // Status Action Methods (Forward, Save, Delete)
  const handleForwardStatus = () => {
    const currentStatus = viewingUser?.statuses[currentStatusIndex];
    const textToShare = currentStatus?.caption || currentStatus?.mediaUrl || "Check out this status!";
    if (navigator.share) {
      navigator.share({ title: 'Status', text: textToShare }).catch(() => { });
    } else {
      navigator.clipboard.writeText(textToShare);
      alert("Status content copied to clipboard for forwarding!");
    }
    setShowMenu(false);
  };

  const handleSaveStatus = () => {
    const currentStatus = viewingUser?.statuses[currentStatusIndex];
    if (!currentStatus) return;

    if (currentStatus.mediaUrl) {
      const a = document.createElement('a');
      a.href = currentStatus.mediaUrl;
      a.download = 'status-media';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert("Text status saved.");
    }
    setShowMenu(false);
  };

  const handleDeleteStatus = async () => {
    const currentStatus = viewingUser?.statuses[currentStatusIndex];
    if (!currentStatus) return;

    if (!window.confirm("Are you sure you want to delete this status?")) return;

    try {
      const statusId = currentStatus._id || currentStatus.id;

      await axios.delete(`${API}/api/status/${statusId}`, {
        data: { userId: currentUserId }
      });

      setShowMenu(false);
      const updatedFeed = feed.map(item => {
        if (item.user._id === viewingUser.user._id || item.user.id === viewingUser.user.id) {
          const remainingStatuses = item.statuses.filter(s => s._id !== statusId && s.id !== statusId);
          return { ...item, statuses: remainingStatuses };
        }
        return item;
      }).filter(item => item.statuses.length > 0);

      setFeed(updatedFeed);
      const updatedViewingUser = updatedFeed.find(
        item => item.user._id === viewingUser.user._id || item.user.id === viewingUser.user.id
      );

      if (!updatedViewingUser || updatedViewingUser.statuses.length === 0) {
        setViewingUser(null);
      } else {
        setViewingUser(updatedViewingUser);
        setCurrentStatusIndex((prev) => (prev > 0 ? prev - 1 : 0));
        setProgress(0);
      }
      fetchStatuses();
    } catch (error) {
      console.error("Error deleting status:", error);
      alert("Failed to delete status.");
    }
  };

  // Other User Quick Actions (Message, Voice Call, Video Call, View Contact)
  const handleContactAction = (actionType) => {
    const userName = viewingUser?.user?.name || "User";
    alert(`${actionType} initiated with ${userName}`);
    setShowMenu(false);
  };

  const uploadMediaToServer = async (file) => {
    const data = new FormData();
    data.append("file", file);
    data.append("sessionId", `status-${currentUserId}`);

    const token = localStorage.getItem("token");
    // Changed axios.get to axios.post for FormData uploads
    const response = await axios.post(`${API}/api/chat/upload`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(() => null);

    return response?.data?.url || URL.createObjectURL(file);
  };

  const handleUploadStatus = async (e) => {
    e.preventDefault();
    if (!currentUserId || currentUserId === "user-default-id") {
      alert("User session not found. Please log in again.");
      return;
    }

    try {
      setUploading(true);
      let finalMediaUrl = mediaUrl;

      if (mediaFile) {
        finalMediaUrl = await uploadMediaToServer(mediaFile);
      }

      const response = await axios.post(`${API}/api/status`, {
        userId: currentUserId,
        mediaUrl: finalMediaUrl,
        caption,
        type,
        backgroundColor: bgColor
      });

      if (response.data?.success) {
        setShowUploadModal(false);
        setCaption("");
        setMediaUrl("");
        setMediaFile(null);
        fetchStatuses();
      }
    } catch (error) {
      console.error("Error uploading status:", error);
      alert("Failed to upload status.");
    } finally {
      setUploading(false);
    }
  };

  const myStatusItem = feed.find(
    (item) => item.user._id === currentUserId || item.user.id === currentUserId
  );

  const otherStatuses = feed.filter(
    (item) => item.user._id !== currentUserId && item.user.id !== currentUserId
  );

  const myAvatarUrl = localUserAvatar
    ? (localUserAvatar.startsWith('http') || localUserAvatar.startsWith('blob:') ? localUserAvatar : `${API}${localUserAvatar}`)
    : null;

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  };

  const isMyStatusViewer = viewingUser?.user?._id === currentUserId || viewingUser?.user?.id === currentUserId;


  return (
    <div className={`status-container theme-${theme}`}>
      <div className="status-content">
        {/* ===== MY STATUS ITEM ===== */}
        <div className="status-item my-status-item">
          <div
            className={`status-avatar-wrapper ${myStatusItem ? "ring" : ""}`}
            onClick={() => {
              if (myStatusItem) {
                setViewingUser(myStatusItem);
                setCurrentStatusIndex(0);
                setIsPaused(false);
              } else {
                setShowUploadModal(true);
              }
            }}
          >
            <div className="status-avatar-inner">
              {myAvatarUrl ? (
                <img src={myAvatarUrl} alt="My Status" />
              ) : (
                localUserName?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>

            <div
              className="add-status-plus-badge"
              title="Add status"
              onClick={(e) => {
                e.stopPropagation();
                setType("text");
                setShowUploadModal(true);
              }}
            >
              +
            </div>
          </div>

          <div
            className="status-info"
            onClick={() => {
              if (myStatusItem) {
                setViewingUser(myStatusItem);
                setCurrentStatusIndex(0);
                setIsPaused(false);
              } else {
                setShowUploadModal(true);
              }
            }}
          >
            <h4>My status</h4>
            <p>
              {myStatusItem
                ? formatTime(myStatusItem.statuses[myStatusItem.statuses.length - 1].createdAt)
                : "Tap to add status update"}
            </p>
          </div>
        </div>

        {/* ===== RECENT SECTION ===== */}
        <div className="status-section-title">Recent</div>

        {loading ? (
          <p className="status-loading">Loading status updates...</p>
        ) : otherStatuses.length === 0 ? (
          <p className="status-empty">No recent status updates</p>
        ) : (
          otherStatuses.map((item) => {
            const contactAvatar = item.user.avatar
              ? (item.user.avatar.startsWith('http') || item.user.avatar.startsWith('blob:') ? item.user.avatar : `${API}${item.user.avatar}`)
              : null;

            const lastStatusItem = item.statuses[item.statuses.length - 1];

            return (
              <div
                key={item.user._id}
                className="status-item"
                onClick={() => {
                  setViewingUser(item);
                  setCurrentStatusIndex(0);
                  setIsPaused(false);
                }}
              >
                <div className="status-avatar-wrapper ring">
                  <div className="status-avatar-inner">
                    {contactAvatar ? (
                      <img src={contactAvatar} alt={item.user.name} />
                    ) : (
                      item.user.name?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                </div>
                <div className="status-info">
                  <h4>{item.user.name}</h4>
                  <p>{formatTime(lastStatusItem?.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FULL SCREEN VIEWER MODAL */}
      {viewingUser && (
        <div className="status-viewer-overlay">
          <div
            className="status-viewer-box"
            style={{
              backgroundColor: viewingUser.statuses[currentStatusIndex]?.backgroundColor || "#075e54"
            }}
          >
            {/* Progress Bars */}
            <div className="status-progress-bars">
              {viewingUser.statuses.map((_, idx) => (
                <div key={idx} className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width:
                        idx < currentStatusIndex
                          ? "100%"
                          : idx === currentStatusIndex
                            ? `${progress}%`
                            : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Viewer Header */}
            <div className="viewer-header">
              <div className="viewer-user-info">
                <div className="status-avatar-sm">
                  {isMyStatusViewer && myAvatarUrl ? (
                    <img src={myAvatarUrl} alt="Me" />
                  ) : viewingUser.user.avatar ? (
                    <img src={viewingUser.user.avatar.startsWith('http') ? viewingUser.user.avatar : `${API}${viewingUser.user.avatar}`} alt="User" />
                  ) : (
                    viewingUser.user.name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
                <div>
                  <span className="viewer-name">
                    {isMyStatusViewer ? "You" : viewingUser.user.name}
                  </span>
                  <span className="viewer-time">
                    {formatTime(viewingUser.statuses[currentStatusIndex]?.createdAt)}
                  </span>
                </div>
              </div>

              {/* Right Controls */}
              <div className="viewer-top-actions">
                <button
                  className="control-icon-btn"
                  onClick={() => setIsPaused(!isPaused)}
                  title={isPaused ? "Play" : "Pause"}
                >
                  {isPaused ? "▶️" : "⏸️"}
                </button>
                <button
                  className="control-icon-btn"
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? "🔇" : "🔊"}
                </button>
                <div className="menu-container">
                  <button
                    className="control-icon-btn"
                    onClick={() => setShowMenu(!showMenu)}
                    title="Menu"
                  >
                    ⋮
                  </button>

                  {showMenu && (
                    <div className="status-dropdown-menu">
                      {isMyStatusViewer ? (
                        <>
                          <button onClick={handleForwardStatus} className="dropdown-menu-item">📤 Forward</button>
                          <button onClick={handleSaveStatus} className="dropdown-menu-item">💾 Save</button>
                          <button onClick={handleDeleteStatus} className="dropdown-menu-item delete-item">🗑️ Delete</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleContactAction("Message")} className="dropdown-menu-item">💬 Message</button>
                          <button onClick={() => handleContactAction("Voice Call")} className="dropdown-menu-item">📞 Voice Call</button>
                          <button onClick={() => handleContactAction("Video Call")} className="dropdown-menu-item">📹 Video Call</button>
                          <button onClick={() => handleContactAction("View Contact")} className="dropdown-menu-item">👤 View Contact</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="viewer-body" onClick={(e) => {
              if (e.target.tagName === 'VIDEO') return;
              handleNextStatus();
            }}>
              {viewingUser.statuses[currentStatusIndex]?.type === "image" ? (
                <img
                  src={viewingUser.statuses[currentStatusIndex].mediaUrl}
                  alt="status"
                  className="viewer-media"
                />
              ) : viewingUser.statuses[currentStatusIndex]?.type === "video" ? (
                <video
                  ref={videoRef}
                  src={viewingUser.statuses[currentStatusIndex].mediaUrl}
                  className="viewer-media"
                  autoPlay
                  playsInline
                  muted={isMuted}
                  onEnded={handleNextStatus}
                />
              ) : (
                <div className="viewer-text-content">
                  <h2>{viewingUser.statuses[currentStatusIndex]?.caption}</h2>
                </div>
              )}
            </div>

            {isMyStatusViewer && (
              <div
                className="status-views-bar"
                onClick={() => setShowViewsDrawer(true)}
              >
                <span>👁️ 0 views</span>
              </div>
            )}

            {showViewsDrawer && (
              <div className="status-views-drawer">
                <div className="drawer-handle" onClick={() => setShowViewsDrawer(false)} />
                <h3>Views (0)</h3>
                <p className="no-views-text">No views yet</p>
              </div>
            )}

            <div className="nav-left" onClick={handlePrevStatus} />
            <div className="nav-right" onClick={handleNextStatus} />
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="upload-modal-overlay">
          <div className="upload-modal">
            <h3>Add Status Update</h3>
            <form onSubmit={handleUploadStatus}>
              <div className="form-group">
                <label>Status Type</label>
                <select value={type} onChange={(e) => { setType(e.target.value); setMediaFile(null); setMediaUrl(""); }}>
                  <option value="text">Text Status</option>
                  <option value="image">Image File / URL</option>
                  <option value="video">Video Status</option>
                </select>
              </div>

              {(type === "image" || type === "video") && (
                <div className="form-group">
                  <label>Select {type === "image" ? "Image" : "Video"} File or Paste URL</label>
                  <input
                    type="file"
                    accept={type === "image" ? "image/*" : "video/*"}
                    ref={fileInputRef}
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  />
                  <input
                    type="text"
                    placeholder={`Or paste ${type} URL here...`}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    style={{ marginTop: '8px' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Caption / Status Text</label>
                <textarea
                  placeholder="Type a status..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                />
              </div>

              {type === "text" && (
                <div className="form-group">
                  <label>Background Color</label>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={uploading}>
                  {uploading ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPage;