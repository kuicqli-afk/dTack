// frontend/src/components/Settings/SettingsContainer.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ProfileSetup from "../Profile/ProfileSetup";
import { 
  MessageSquare, 
  RefreshCw, 
  Megaphone, 
  Star, 
  Archive, 
  User, 
  Key, 
  Lock, 
  Bell, 
  HelpCircle, 
  Search, 
  LogOut, 
  ArrowLeft 
} from "lucide-react";
import "./Settings.css"; 

const API = "http://localhost:5000";

const SettingsContainer = ({ userId, onLogout, activeTab = "chats", setActiveTab }) => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(true);
  const [activeSettingsView, setActiveSettingsView] = useState("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileData, setProfileData] = useState({
    name: "Mohammad Amir",
    bio: "At work",
    avatar: "",
    username: "",
    phone: ""
  });
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    let appliedTheme = theme;
    if (theme === "system") {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      appliedTheme = systemPrefersDark ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", appliedTheme);
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  const currentUserId = userId || localStorage.getItem("userId") || "anonymous";

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/api/users/profile/${currentUserId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data?.success && res.data.profile) {
          const p = res.data.profile;
          setProfileData({
            name: p.name || localStorage.getItem("userName") || "Mohammad Amir",
            bio: p.bio || p.about || "At work",
            avatar: p.avatar || localStorage.getItem("userAvatar") || "",
            username: p.username || "",
            phone: p.phone || ""
          });
        }
      } catch (err) {
        const local = localStorage.getItem("userProfile");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setProfileData(prev => ({
              ...prev,
              name: parsed.name || prev.name,
              bio: parsed.bio || parsed.about || prev.bio,
              avatar: parsed.avatar || prev.avatar,
              username: parsed.username || prev.username,
              phone: parsed.phone || prev.phone
            }));
          } catch (e) { }
        }
      }
    };
    fetchUserData();

    const handleProfileUpdate = (e) => {
      if (e.detail) {
        setProfileData(prev => ({
          ...prev,
          name: e.detail.name || prev.name,
          bio: e.detail.bio || e.detail.about || prev.bio,
          avatar: e.detail.avatar || prev.avatar,
          username: e.detail.username || prev.username,
          phone: e.detail.phone || prev.phone
        }));
      }
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, [currentUserId]);

  const menuItems = [
    {
      id: "profile",
      icon: <User size={20} />,
      title: "Profile",
      subtitle: "Name, profile picture, username",
    },
    {
      id: "account",
      icon: <Key size={20} />,
      title: "Account",
      subtitle: "Security notifications, account info",
    },
    {
      id: "privacy",
      icon: <Lock size={20} />,
      title: "Privacy",
      subtitle: "Blocked contacts, disappearing messages",
    },
    {
      id: "chats",
      icon: <MessageSquare size={20} />,
      title: "Chats",
      subtitle: "Theme, wallpaper, chat settings",
    },
    {
      id: "notifications",
      icon: <Bell size={20} />,
      title: "Notifications",
      subtitle: "Messages, groups, sounds",
    },
    {
      id: "help",
      icon: <HelpCircle size={20} />,
      title: "Help and feedback",
      subtitle: "Help centre, contact us, privacy policy",
    },
  ];

  const filteredItems = menuItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userProfile");
      navigate("/login");
    }
  };

  if (activeSettingsView === "profile") {
    return <ProfileSetup userId={currentUserId} onBack={() => setActiveSettingsView("main")} />;
  }

  return (
    <div className="whatsapp-settings-wrapper">
      {/* WhatsApp Leftmost Narrow Icon Bar */}
      <div className="whatsapp-left-icon-bar">
        <div className="top-icons">
          <button
            className={`icon-btn ${activeTab === 'chats' && !showSettings ? 'active' : ''}`}
            onClick={() => {
              setShowSettings(false);
              setActiveTab && setActiveTab('chats');
            }}
            title="Chats"
          >
            <MessageSquare size={20} />
          </button>
          <button
            className={`icon-btn ${activeTab === 'status' && !showSettings ? 'active' : ''}`}
            onClick={() => {
              setShowSettings(false);
              setActiveTab && setActiveTab('status');
            }}
            title="Status"
          >
            <RefreshCw size={20} />
          </button>
          <button
            className={`icon-btn ${activeTab === 'channels' && !showSettings ? 'active' : ''}`}
            onClick={() => {
              setShowSettings(false);
              setActiveTab && setActiveTab('channels');
            }}
            title="Channels"
          >
            <Megaphone size={20} />
          </button>
        </div>

        <div className="bottom-icons">
          <button className="icon-btn" title="Starred Messages">
            <Star size={20} />
          </button>
          <button className="icon-btn" title="Archived">
            <Archive size={20} />
          </button>

          <div
            className={`whatsapp-bottom-profile-icon ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            {profileData.avatar ? (
              <img
                src={profileData.avatar.startsWith('http') || profileData.avatar.startsWith('blob:') || profileData.avatar.startsWith('data:') ? profileData.avatar : `${API}${profileData.avatar}`}
                alt="Profile"
              />
            ) : (
              <div className="profile-icon-initials">
                {profileData.name ? profileData.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conditional Main View or Settings Sidebar */}
      {showSettings ? (
        <div className="whatsapp-settings-sidebar">
          <div className="whatsapp-settings-top-header">
            <div className="whatsapp-user-header-info">
              <span className="whatsapp-header-username">{profileData.name}</span>
            </div>
            <div className="whatsapp-avatar-status-container">
              {profileData.bio && (
                <div className="whatsapp-status-bubble">
                  <span>{profileData.bio}</span>
                </div>
              )}
              <div
                className="whatsapp-main-avatar"
                onClick={() => setActiveSettingsView("profile")}
                title="Click to view profile"
              >
                {profileData.avatar ? (
                  <img src={profileData.avatar.startsWith('http') || profileData.avatar.startsWith('blob:') || profileData.avatar.startsWith('data:') ? profileData.avatar : `${API}${profileData.avatar}`} alt="Avatar" />
                ) : (
                  <div className="whatsapp-main-avatar-initials">
                    {profileData.name ? profileData.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="whatsapp-settings-search-box">
            <div className="whatsapp-search-input-wrapper">
              <Search className="whatsapp-search-icon" size={14} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="whatsapp-settings-list">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="whatsapp-settings-item"
                onClick={() => {
                  if (item.id === "profile") {
                    setActiveSettingsView("profile");
                  } else {
                    setActiveSettingsView(item.id);
                  }
                }}
              >
                <div className="whatsapp-item-icon">{item.icon}</div>
                <div className="whatsapp-item-content">
                  <div className="whatsapp-item-title">{item.title}</div>
                  <div className="whatsapp-item-subtitle">{item.subtitle}</div>
                </div>
              </div>
            ))}

            <div className="whatsapp-settings-item logout-item" onClick={handleLogoutClick}>
              <div className="whatsapp-item-icon">
                <LogOut size={20} />
              </div>
              <div className="whatsapp-item-content">
                <div className="whatsapp-item-title logout-text">Log out</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="whatsapp-main-chat-placeholder">
          {/* Your Chats list or active tab content renders here when settings is closed */}
          <div style={{ padding: "40px", color: "#8696a0" }}>
            <h2>{activeTab === 'chats' ? 'Chats' : activeTab === 'status' ? 'Status' : 'Channels'}</h2>
            <p>Click the bottom-left profile icon to open Settings.</p>
          </div>
        </div>
      )}

      {/* Right Pane Display for Sub-Views when a setting option is clicked */}
      {showSettings && activeSettingsView !== "main" && activeSettingsView !== "profile" && (
        <div className="whatsapp-sub-pane">
          <div className="whatsapp-sub-pane-header">
            <button onClick={() => setActiveSettingsView("main")}>
              <ArrowLeft size={20} />
            </button>
            <h2>{menuItems.find((m) => m.id === activeSettingsView)?.title || "Settings"}</h2>
          </div>
          <div className="whatsapp-sub-pane-content">
            {activeSettingsView === "account" && (
              <div className="sub-pane-section">
                <h3>Account Settings</h3>
                <p>Manage security notifications, passkeys, and account details.</p>
                <div className="setting-card-row">
                  <span>Security notifications</span>
                  <input type="checkbox" defaultChecked />
                </div>
                <div className="setting-card-row">
                  <span>Two-step verification</span>
                  <button className="sub-btn">Configure</button>
                </div>
                <div className="setting-card-row danger-row">
                  <span>Delete my account</span>
                  <button className="sub-btn danger">Delete</button>
                </div>
              </div>
            )}

            {activeSettingsView === "privacy" && (
              <div className="sub-pane-section">
                <h3>Privacy Settings</h3>
                <p>Control who can see your personal info and messages.</p>
                <div className="setting-card-row">
                  <span>Last seen and online</span>
                  <select defaultValue="everyone"><option value="everyone">Everyone</option><option value="contacts">My contacts</option></select>
                </div>
                <div className="setting-card-row">
                  <span>Profile photo</span>
                  <select defaultValue="everyone"><option value="everyone">Everyone</option><option value="contacts">My contacts</option></select>
                </div>
                <div className="setting-card-row">
                  <span>Disappearing messages</span>
                  <span>Off</span>
                </div>
              </div>
            )}

            {activeSettingsView === "chats" && (
              <div className="sub-pane-section">
                <h3>Chat Settings</h3>
                <p>Customize your chat wallpaper and theme.</p>
                <div className="setting-card-row">
                  <span>Theme</span>
                  <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">System default</option>
                  </select>
                </div>
                <div className="setting-card-row">
                  <span>Enter is send</span>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
            )}

            {activeSettingsView === "notifications" && (
              <div className="sub-pane-section">
                <h3>Notification Settings</h3>
                <p>Configure message and group sound alerts.</p>
                <div className="setting-card-row">
                  <span>Message sounds</span>
                  <input type="checkbox" defaultChecked />
                </div>
                <div className="setting-card-row">
                  <span>Previews</span>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
            )}

            {activeSettingsView === "help" && (
              <div className="sub-pane-section">
                <h3>Help and Feedback</h3>
                <p>Get assistance or review legal documents.</p>
                <div className="setting-link-item">Help Centre</div>
                <div className="setting-link-item">Contact Us</div>
                <div className="setting-link-item">Terms and Privacy Policy</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsContainer;