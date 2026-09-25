// frontend/src/components/Dbirds.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dTalk from "../assets/dtalk (1).png";
import {
  Phone,
  RefreshCw,
  Image as ImageIcon,
  User,
  Key,
  Lock,
  MessageCircle,
  Bell,
  HelpCircle,
  LogOut,
  Search,
  FileText,
  X,
  ChevronLeft,
  PhoneCall,
  UserPlus,
  Settings,
  Sun,
  Moon,
  MessageSquare,
  CircleDot
} from "lucide-react";
import ChatWindow from "./ChatWindow";
import StatusPage from "./StatusPage";
import ProfileSetup from "./Profile/ProfileSetup";
import { getStoreInfo, getContacts } from "../services/api";
import "./Dbirds.css";

const API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "https://dtalkbusiness.designerbrids.com/"
    : "");

const formatWhatsAppDate = (dateInput) => {
  if (!dateInput) return "";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return dateInput; // agar already formatted string hai

  const now = new Date();

  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) {
    // Aaj — sirf time dikhayein
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }

  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    // Isी hafte ka — din ka naam
    return date.toLocaleDateString([], { weekday: "long" });
  }

  // Purana — short date
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
};
const Dbirds = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("chats");
  const [activeFilter, setActiveFilter] = useState("All");
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [userId, setUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const [rightPaneView, setRightPaneView] = useState("none"); // 'none' | 'add-contact'

  // Settings States
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsView, setActiveSettingsView] = useState("main");
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("themeMode") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);


  const [newContactForm, setNewContactForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    countryCode: "IN +91",
    phone: "",
    syncToPhone: false,
  });
  const [savingContact, setSavingContact] = useState(false);

  const [localUserName, setLocalUserName] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) return parsed.name;
      } catch (e) { }
    }
    return localStorage.getItem("userName") || "User";
  });

  const [localUserAvatar, setLocalUserAvatar] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.avatar) return parsed.avatar;
      } catch (e) { }
    }
    return localStorage.getItem("userAvatar") || "";
  });

  const [localUserBio, setLocalUserBio] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.bio || parsed.about) return parsed.bio || parsed.about;
      } catch (e) { }
    }
    return "Available";
  });

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    setShowSettings(false);
    setRightPaneView("none");
  };

  const handleGalleryFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/api/chat/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.data?.success) {
        const fileData = res.data.file;
        alert(`File uploaded successfully: ${fileData.originalName || "Media"}`);
      }
    } catch (err) {
      console.error("Gallery upload error:", err);
      alert("Failed to upload file.");
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDocumentSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/api/chat/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.data?.success) {
        alert(`Document sent successfully: ${file.name}`);
      }
    } catch (err) {
      console.error("Document upload error:", err);
      alert("Failed to send document.");
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!newContactForm.phone || !newContactForm.firstName) {
      alert("Please provide at least a first name and phone number.");
      return;
    }

    try {
      setSavingContact(true);
      const token = localStorage.getItem("token");
      const dialCode = newContactForm.countryCode.split(" ")[1] || "";

      const payload = {
        name: `${newContactForm.firstName} ${newContactForm.lastName}`.trim(),
        username: newContactForm.username,
        phone: `${dialCode}${newContactForm.phone}`,
        syncToPhone: newContactForm.syncToPhone,
      };

      const res = await axios.post(`${API}/api/admin/auth/store-info`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},

      });

      if (res.data?.success) {
        alert("Contact added successfully!");
        setContacts((prev) => [res.data.contact, ...prev]);
        setRightPaneView("none");
        setNewContactForm({
          firstName: "",
          lastName: "",
          username: "",
          countryCode: "IN +91",
          phone: "",
          syncToPhone: false,
        });
      }
      console.log("Shyam API - Save Contact Response:", res);
    } catch (err) {
      console.error("Error adding contact:", err);
      alert("Failed to add contact.");
    } finally {
      setSavingContact(false);
    }
  };

  const handleLogoutClick = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatar");
    navigate("/login");
  };

  useEffect(() => {
    const handlePopState = () => {
      if (selectedContact) {
        setSelectedContact(null);
        return;
      }
      if (rightPaneView !== "none") {
        setRightPaneView("none");
        return;
      }
      if (showSettings) {
        if (activeSettingsView !== "main") {
          setActiveSettingsView("main");
        } else {
          setShowSettings(false);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedContact, rightPaneView, showSettings, activeSettingsView]);

  const fetchUserDataAndContacts = async () => {
    const storedUserId = localStorage.getItem("userId");
    if (!storedUserId) return;
    setUserId(storedUserId);

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Store info
      const userResponse = await axios.get(`${API}/api/admin/auth/store-info`, { headers });
      const storeData =
        userResponse.data?.store?.data ||
        userResponse.data?.store ||
        userResponse.data?.data ||
        userResponse.data;

      if (storeData) {
        const storeContact = {
          _id: "store-info",
          id: "store-info",
          name: storeData.name || "Store",
          phone: storeData.phone || "",
          avatar:
            storeData.avatar ||
            storeData.profileImage ||
            storeData.photo ||
            storeData.image ||
            "",
          profileImage:
            storeData.profileImage ||
            storeData.avatar ||
            storeData.photo ||
            storeData.image ||
            "",
          bio: storeData.address || "Store Info",
          lastMessage: storeData.address || "No address available",
          lastMessageTime: "",
          isOnline: true,
          role: "store",
        };

        // 2. Real contacts
        try {
          const contactsResponse = await axios.get(`${API}/api/auth/contacts`, {
            params: { userId: storedUserId },
            headers,
          });
          const fetchedContacts = contactsResponse.data?.contacts || [];
          setContacts([
            storeContact,
            ...(Array.isArray(fetchedContacts) ? fetchedContacts : []),
          ]);
        } catch (contactErr) {
          console.error("❌ Error fetching contacts list:", contactErr);
          setContacts([storeContact]);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      setContacts([]);
    }
  };

  useEffect(() => {
    fetchUserDataAndContacts();
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e.detail) {
        if (e.detail.name) setLocalUserName(e.detail.name);
        if (e.detail.avatar !== undefined) setLocalUserAvatar(e.detail.avatar);
        if (e.detail.bio !== undefined) setLocalUserBio(e.detail.bio);
      }
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, []);

  useEffect(() => {
    if (!showSettings) {
      fetchUserDataAndContacts();
    }
  }, [showSettings]);

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "Unread") return matchesSearch && c.unread;
    return matchesSearch;
  });

  const settingsMenuItems = [
    { id: "profile", icon: <User size={18} />, title: "Profile", subtitle: "Name, photo and status" },
    { id: "account", icon: <Key size={18} />, title: "Account", subtitle: "Security notifications, change number" },
    { id: "privacy", icon: <Lock size={18} />, title: "Privacy", subtitle: "Last seen, profile photo, groups" },
    { id: "chats", icon: <MessageCircle size={18} />, title: "Theme", subtitle: "Dark or Light appearance" },
    { id: "notifications", icon: <Bell size={18} />, title: "Notifications", subtitle: "Message tones, desktop alerts" },
    { id: "help", icon: <HelpCircle size={18} />, title: "Help", subtitle: "Help center, contact us" },
  ];

  const filteredSettingsItems = settingsMenuItems.filter(
    (item) =>
      item.title.toLowerCase().includes(settingsSearchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(settingsSearchQuery.toLowerCase())
  );

  const myAvatarUrl = localUserAvatar
    ? localUserAvatar.startsWith("http") ||
      localUserAvatar.startsWith("blob:") ||
      localUserAvatar.startsWith("data:")
      ? localUserAvatar
      : `${API}${localUserAvatar}`
    : null;


  return (
    <div className={`db-workspace-shell theme-${themeMode} ${selectedContact ? "chat-open" : ""}`}>
      {/* 1. SaaS Workspace Rail */}
      <div className="db-workspace-rail">
        <div className="db-workspace-rail-top">
          <div
            className="db-workspace-brand"
            onClick={() => {
              setActiveTab("chats");
              setShowSettings(false);
              setSelectedContact(null);
              setRightPaneView("none");
            }}
            title="Dbirds Workspace (Chats)"
            style={{ cursor: "pointer" }}
          >
            <div className="db-brand-logo" title="Dbirds Chat">
              <img
                src={dTalk}
                alt="Dbirds Logo"
                className="brand-logo-img"
              />
            </div>
          </div>
        </div>

        <div className="db-rail-footer">

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleGalleryFileSelect}
            accept="image/*,video/*,audio/*"
            style={{ display: "none" }}
          />

          <button
            type="button"
            className="db-nav-item"
            onClick={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
            title="Toggle Theme"
          >
            {themeMode === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            type="button"
            className={`db-nav-item ${showSettings ? "active" : ""}`}
            onClick={() => {
              setShowSettings(true);
              setActiveSettingsView("main");
              setSelectedContact(null);
            }}
            title="Workspace Settings"
          >
            <Settings size={20} />
          </button>

          <div
            className="db-user-pill"
            onClick={() => {
              setShowSettings(true);
              setActiveSettingsView("profile");
              setSelectedContact(null);
            }}
          >
            {myAvatarUrl ? (
              <img src={myAvatarUrl} alt="Profile" className="db-user-avatar-img" />
            ) : (
              <div
                className="db-user-avatar-initials"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  color: '#ffffff',
                  fontWeight: 'bold'
                }}
              >
                {/* ✅ Yahan getInitials use karein ya safe logic lagayein */}
                {(() => {
                  const name = localUserName;
                  if (!name) return "U";
                  const strName = String(name);
                  if (strName.startsWith("+91") || strName.startsWith("+")) {
                    return strName.replace(/[^0-9]/g, "").slice(-1) || "U";
                  }
                  return strName.charAt(0).toUpperCase();
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Secondary Inbox / Contacts Column */}
      {showSettings ? (
        <div className="db-sidebar-panel">
          {activeSettingsView === "profile" ? (
            <ProfileSetup userId={userId} theme={themeMode} onBack={() => {
              fetchUserDataAndContacts();
              setActiveSettingsView("main");
            }} />
          ) : activeSettingsView !== "main" ? (
            <div className="db-sub-pane">
              <div className="db-sub-pane-header">
                <button type="button" onClick={() => setActiveSettingsView("main")}>
                  <ChevronLeft size={18} />
                </button>
                <h2>
                  {settingsMenuItems.find((m) => m.id === activeSettingsView)?.title || "Settings"}
                </h2>
              </div>
              <div className="db-sub-pane-content">
                {activeSettingsView === "account" && (
                  <div className="db-setting-card">
                    <h3>Account Security</h3>
                    <p>Manage your account security and authentication settings.</p>
                    <div className="db-setting-row">
                      <span>Security notifications</span>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div className="db-setting-row">
                      <span>Two-step verification</span>
                      <button className="db-btn-outline" type="button">Turn on</button>
                    </div>
                  </div>
                )}

                {activeSettingsView === "privacy" && (
                  <div className="db-setting-card">
                    <h3>Privacy Settings</h3>
                    <p>Control who can see your personal info.</p>
                    <div className="db-setting-row">
                      <span>Activity status</span>
                      <select defaultValue="everyone">
                        <option value="everyone">Everyone</option>
                        <option value="contacts">My workspace</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeSettingsView === "chats" && (
                  <div className="db-setting-card">
                    <h3>Appearance Mode</h3>
                    <p>Choose your workspace theme.</p>
                    <div className="db-setting-row">
                      <span>Theme</span>
                      <select
                        value={themeMode}
                        onChange={(e) => setThemeMode(e.target.value)}
                      >
                        <option value="dark">Obsidian Dark</option>
                        <option value="light">Crisp Light</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeSettingsView === "notifications" && (
                  <div className="db-setting-card">
                    <h3>Notification Preferences</h3>
                    <div className="db-setting-row">
                      <span>Desktop alerts</span>
                      <input type="checkbox" defaultChecked />
                    </div>
                  </div>
                )}

                {activeSettingsView === "help" && (
                  <div className="db-setting-card">
                    <h3>Help & Support</h3>
                    <p>Need assistance? Contact support or inspect session status.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="db-profile-header-card" onClick={() => setActiveSettingsView("profile")}>
                <div className="db-avatar-lg">
                  {myAvatarUrl ? (
                    <img src={myAvatarUrl} alt="Avatar" />
                  ) : (
                    localUserName?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
                <div className="db-user-meta">
                  {localUserName}
                  <span className="db-userbio">{localUserBio}</span>
                </div>
              </div>

              <div className="db-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Filter settings..."
                  value={settingsSearchQuery}
                  onChange={(e) => setSettingsSearchQuery(e.target.value)}
                />
              </div>

              <div className="db-menu-list">
                {filteredSettingsItems.map((item) => (
                  <div
                    key={item.id}
                    className="db-menu-card-item"
                    onClick={() => setActiveSettingsView(item.id)}
                  >
                    <div className="db-menu-icon">{item.icon}</div>
                    <div className="db-menu-text">
                      <div className="db-menu-title">{item.title}</div>
                      <div className="db-menu-subtitle">{item.subtitle}</div>
                    </div>
                  </div>
                ))}

                <div className="db-menu-card-item logout" onClick={handleLogoutClick}>
                  <div className="db-menu-icon">
                    <LogOut size={18} />
                  </div>
                  <div className="db-menu-text">
                    <div className="db-menu-title">Sign Out</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="db-sidebar-panel">
          <div className="db-sidebar-top">
            <div className="db-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2>{activeTab === "chats" ? "talk bussiness" : activeTab === "status" ? "Team Feeds" : "Voice Channels"}</h2>
              </div>
              {activeTab === "chats" && (
                <button
                  type="button"
                  title="Add Contact"
                  onClick={() => setRightPaneView(rightPaneView === "add-contact" ? "none" : "add-contact")}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}
                >
                  <UserPlus size={18} />
                </button>
              )}
            </div>

            {activeTab === "chats" && (
              <>
                <div className="db-search-box">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search people or threads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="db-pill-tabs">
                  {["All", "Unread"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`db-tab-pill ${activeFilter === f ? "active" : ""}`}
                      onClick={() => setActiveFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="db-sidebar-scroll">
            {activeTab === "chats" ? (
              <div className="db-card-list">
                {filteredContacts.length === 0 ? (
                  <div className="db-empty-state">No conversations found</div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact._id || contact.id}
                      className={`db-contact-card ${selectedContact?._id === contact._id ? "active" : ""}`}
                      onClick={() => handleSelectContact(contact)}
                    >
                      <div className="db-contact-avatar-wrap">
                        {contact.avatar || contact.profileImage ? (
                          <img
                            src={contact.avatar || contact.profileImage}
                            alt={contact.name || "Shopkeeper"}
                            className="db-contact-avatar-img"
                          />
                        ) : (
                          contact.name?.charAt(0)?.toUpperCase() || "C"
                        )}

                        {contact.isOnline === true && (
                          <span className="db-status-dot online" />
                        )}
                      </div>
                      <div className="db-contact-info">
                        <div className="db-contact-top">
                          <span className="db-contact-name">
                            {contact.name || "Unknown User"}
                          </span>
                          <span className="db-contact-time">
                            {formatWhatsAppDate(contact.lastMessageTime)}
                          </span>
                        </div>

                        <div className="db-contact-phone">
                          <Phone size={13} />
                          <span>{contact.phone || "No phone number"}</span>
                        </div>

                        <div className="db-contact-preview">
                          <p>{contact.lastMessage || contact.bio || "Start conversation..."}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === "status" ? (
              <StatusPage userId={userId} theme={themeMode} />

            ) : (
              <div className="db-empty-state">
                <PhoneCall size={32} />
                <span>No active channels</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Stage / Active View */}
      {selectedContact ? (
        <ChatWindow
          userId={userId}
          contact={selectedContact}
          theme={themeMode}  // Yeh ensure karein ki passed hai
          onBack={() => setSelectedContact(null)}
          onOpenProfile={() => setShowProfile(true)}
        />
      ) : activeTab === "status" ? (
        <div className="db-main-stage">
          <div className="db-stage-card-empty">
            <RefreshCw size={36} className="db-accent-icon" />
            <h3>Activity & Status Stream</h3>
            <p>Recent updates from your team members will appear here.</p>
          </div>
        </div>
      ) : activeTab === "calls" ? (
        <div className="db-main-stage">
          <div className="db-stage-card-empty">
            <PhoneCall size={36} className="db-accent-icon" />
            <h3>Voice Huddles & Meetings</h3>
            <p>Start a quick audio or video huddle with your team.</p>
          </div>
        </div>
      ) : (
        <div className="db-main-stage">
          {rightPaneView === "add-contact" ? (
            <div className="db-form-drawer-card">
              <div className="db-drawer-top">
                <h3>Add Team Contact</h3>
                <button type="button" onClick={() => setRightPaneView("none")}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="db-form">
                <div className="db-field">
                  <label>First Name</label>
                  <input
                    type="text"
                    placeholder="First name"
                    value={newContactForm.firstName}
                    onChange={(e) =>
                      setNewContactForm({ ...newContactForm, firstName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="db-field">
                  <label>Last Name</label>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={newContactForm.lastName}
                    onChange={(e) =>
                      setNewContactForm({ ...newContactForm, lastName: e.target.value })
                    }
                  />
                </div>

                <div className="db-field">
                  <label>Username / Handle</label>
                  <input
                    type="text"
                    placeholder="@handle"
                    value={newContactForm.username}
                    onChange={(e) =>
                      setNewContactForm({ ...newContactForm, username: e.target.value })
                    }
                  />
                </div>

                <div className="db-field">
                  <label>Phone Number</label>
                  <div className="db-phone-group">
                    <select
                      value={newContactForm.countryCode}
                      onChange={(e) =>
                        setNewContactForm({ ...newContactForm, countryCode: e.target.value })
                      }
                    >
                      <option value="IN +91">+91 (IN)</option>
                      <option value="US +1">+1 (US)</option>
                      <option value="GB +44">+44 (UK)</option>
                      <option value="AE +971">+971 (UAE)</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={newContactForm.phone}
                      onChange={(e) =>
                        setNewContactForm({ ...newContactForm, phone: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="db-checkbox-field">
                  <input
                    type="checkbox"
                    id="syncPhone"
                    checked={newContactForm.syncToPhone}
                    onChange={(e) =>
                      setNewContactForm({ ...newContactForm, syncToPhone: e.target.checked })
                    }
                  />
                  <label htmlFor="syncPhone">Sync contact to device phonebook</label>
                </div>

                <button type="submit" className="db-btn-primary" disabled={savingContact}>
                  {savingContact ? "Saving..." : "Add to Directory"}
                </button>
              </form>
            </div>
          ) : (
            <div className="db-welcome-stage">
              <div className="db-welcome-card">
                <div className="db-badge">DBIRDS CHAT</div>
                <h1>Welcome Dbirds Chat</h1>
                <p>Select or attach a document to start collaborating.</p>
                <div className="db-welcome-actions">
                  <button
                    type="button"
                    className="db-btn-outline"
                    onClick={() => docInputRef.current?.click()}
                  >
                    <FileText size={16} /> Upload Document
                  </button>
                </div>
                <input
                  type="file"
                  ref={docInputRef}
                  onChange={handleDocumentSelect}
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                  style={{ display: "none" }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dbirds;