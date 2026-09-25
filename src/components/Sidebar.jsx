import React, { useState, useEffect } from 'react';
import { getContacts } from '../services/api';
import './Sidebar.css';
import axios from 'axios';

// ✅ getInitials ko yahan top-level ya helper function ki tarah define karein
const getInitials = (name) => {
  if (!name || name === 'Unknown User') return 'U';
  if (name.startsWith('+91') || name.startsWith('+')) {
    return name.replace(/[^0-9]/g, '').slice(-1) || 'U';
  }
  return name.charAt(0).toUpperCase();
};

const Sidebar = ({ userId, userName, userPhone, userAvatar, selected, onSelect, onOpenProfile, onDeleteChat, onClearChat }) => {
  const [activeMenuChatId, setActiveMenuChatId] = useState(null);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteChat = async (chatId, contactObj, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://dtalkbackend.designerbrids.com/api/chats/${chatId}`,{
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setContacts(prev => prev.filter(c => (c.id || c._id) !== chatId));
      if (onDeleteChat) onDeleteChat(chatId, contactObj);
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const handleClearChat = async (chatId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to clear messages?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(`https://dtalkbusiness.designerbrids.com/api/chats/${chatId}/clear`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (onClearChat) onClearChat(chatId);
      alert("Chat cleared successfully");
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuChatId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const [localUserName, setLocalUserName] = useState(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) return parsed.name;
      } catch (e) { }
    }
    return userName;
  });

  const [localUserAvatar, setLocalUserAvatar] = useState(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.avatar) return parsed.avatar;
      } catch (e) { }
    }
    return userAvatar;
  });

  const [localUserPhone, setLocalUserPhone] = useState(userPhone);

  useEffect(() => {
    if (userName) setLocalUserName(userName);
    if (userPhone) setLocalUserPhone(userPhone);
    if (userAvatar) setLocalUserAvatar(userAvatar);
  }, [userName, userPhone, userAvatar]);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e.detail) {
        if (e.detail.name) setLocalUserName(e.detail.name);
        if (e.detail.avatar !== undefined) setLocalUserAvatar(e.detail.avatar);

        const saved = localStorage.getItem('userProfile');
        let profileObj = saved ? JSON.parse(saved) : {};
        profileObj.name = e.detail.name || profileObj.name;
        profileObj.avatar = e.detail.avatar !== undefined ? e.detail.avatar : profileObj.avatar;
        localStorage.setItem('userProfile', JSON.stringify(profileObj));
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const displayName = localUserName && localUserName.trim() !== ''
    ? localUserName
    : localUserPhone
      ? `+91 ${localUserPhone}`
      : 'Kuickli Chat';

  useEffect(() => {
    const fetchAllUsersDirectly = async () => {
      try {
        const res = await getContacts(userId);
        const contactData =
          res.data?.contacts ||
          res.data?.users ||
          (Array.isArray(res.data) ? res.data : []);
        setContacts(contactData);
      } catch (error) {
        console.error('Failed to load contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      fetchAllUsersDirectly();
    }
  }, [userId]);

  const filtered = contacts.filter((c) => {
    const term = search.toLowerCase().trim();
    const phone = c.phone ? String(c.phone).toLowerCase() : '';
    const name = c.name ? String(c.name).toLowerCase() : '';
    return phone.includes(term) || name.includes(term);
  });

  const myAvatarUrl = localUserAvatar
    ? (localUserAvatar.startsWith('http') || localUserAvatar.startsWith('blob:') || localUserAvatar.startsWith('data:')
      ? localUserAvatar
      : `https://dtalkbusiness.designerbrids.com/${localUserAvatar}`)
    : null;

  if (loading) {
    return (
      <div className="sidebar">
        <div className="loading-contacts">
          ⏳ Loading database users...
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand" onClick={onOpenProfile} title="Click to view/edit profile">
          <div className="sidebar-my-avatar">
            {myAvatarUrl ? (
              <img src={myAvatarUrl} alt="Profile" />
            ) : (
              getInitials(displayName) // ✅ Ab yeh function yahan bina error ke chalega
            )}
          </div>
          <h2>{displayName}</h2>
        </div>
        <button className="new-chat-btn" onClick={onOpenProfile} title="Profile Settings">
          ⚙️
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search or start new chat"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Contact List */}
      <div className="contact-list">
        {filtered.length === 0 ? (
          <div className="no-contacts-msg">
            <p>No other users found in MongoDB collection.</p>
          </div>
        ) : (
          filtered.map((c, index) => {
            const hasCustomName =
              c.name &&
              !String(c.name).startsWith('User_') &&
              !String(c.name).startsWith('+91') &&
              (!c.phone || !String(c.name).includes(c.phone));

            const contactName = hasCustomName
              ? c.name
              : c.phone
                ? `+91 ${c.phone}`
                : 'Unknown User';

            const previewText = c.lastMessage || c.status || 'Start conversation';

            const isSelected =
              selected?.phone === c.phone ||
              selected?.id === c.id ||
              selected?._id === c.id ||
              selected?._id === c._id;

          
            const rawAvatar = c.avatar || c.profileImage || c.profilePic || c.photo || c.image || c.picture;

            const avatarUrl = rawAvatar
              ? (rawAvatar.startsWith('http') || rawAvatar.startsWith('blob:') || rawAvatar.startsWith('data:')
                ? rawAvatar
                : `https://dtalkbusiness.designerbrids.com/${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`)
              : null;

            const chatId = c.id || c._id || index;

            return (
              <div
                key={chatId}
                className={`contact-item ${isSelected ? 'active' : ''}`}
                onClick={() => onSelect(c)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveMenuChatId(chatId);
                }}
              >
                {/* Avatar Section */}
                <div
                  className="contact-avatar"
                  style={{ background: avatarUrl ? 'transparent' : getColor(index) }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={contactName}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    getInitials(contactName)
                  )}
                  {c.isOnline && <span className="online-dot"></span>}
                </div>

                {/* Middle Info Section */}
                <div className="contact-info">
                  <div className="contact-name-row">
                    <span className="contact-name">{contactName}</span>
                  </div>
                  <div className="contact-preview-row">
                    <span className="contact-preview-text">{previewText}</span>
                  </div>
                </div>

                {/* Right Side: Time & Unread Badge */}
                <div className="contact-meta">
                  <span className="contact-time">
                    {c.lastMessageTime
                      ? new Date(c.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                  {c.unreadCount > 0 && <span className="unread-badge">{c.unreadCount}</span>}
                </div>

                {/* Context Menu on Right Click */}
                {activeMenuChatId === chatId && (
                  <div className="whatsapp-context-menu" onClick={(e) => e.stopPropagation()}>
                    <div onClick={() => setActiveMenuChatId(null)}>
                      <span className="icon">📥</span> Archive chat
                    </div>
                    <div onClick={() => setActiveMenuChatId(null)}>
                      <span className="icon">🔕</span> Mute notifications ➔
                    </div>
                    <div onClick={() => setActiveMenuChatId(null)}>
                      <span className="icon">📌</span> Pin chat
                    </div>
                    <div onClick={() => setActiveMenuChatId(null)}>
                      <span className="icon">🟩</span> Mark as unread
                    </div>
                    <div onClick={() => setActiveMenuChatId(null)}>
                      <span className="icon">⭐</span> Add to favourites
                    </div>
                    <div onClick={() => setActiveMenuChatId(null)}>
                      <span className="icon">📁</span> Add to list ➔
                    </div>
                    <hr className="menu-divider" />
                    <div onClick={() => setActiveMenuChatId(null)} className="menu-danger">
                      <span className="icon">🚫</span> Block
                    </div>
                    <div onClick={(e) => {
                      handleClearChat(chatId, e);
                      setActiveMenuChatId(null);
                    }}>
                      <span className="icon">🧹</span> Clear chat
                    </div>
                    <div onClick={(e) => {
                      handleDeleteChat(chatId, c, e);
                      setActiveMenuChatId(null);
                    }} className="menu-danger">
                      <span className="icon">🗑️</span> Delete chat
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-footer">
        <span>⚡ Powered by Kuicqli Chat</span>
      </div>
    </div>
  );
};

const getColor = (id) => {
  const colors = ['#00a884', '#53bdeb', '#f8a846', '#ffd279', '#90d67f', '#ff7b7b'];
  return colors[id % colors.length];
};

export default Sidebar;