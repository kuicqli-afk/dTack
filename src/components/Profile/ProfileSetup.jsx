// frontend/src/components/Profile/ProfileSetup.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfileSetup.css";

const API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "https://dtalkbusiness.designerbrids.com/"
    : "");

const ProfileSetup = ({ userId, onBack }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    username: "",
    avatar: "",
  });

  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Theme state synchronized with Sidebar & localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || localStorage.getItem("kuicqli_theme") || "light";
  });

  // Listen to theme changes from other components / sidebar button
  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail) {
        setTheme(e.detail);
      } else {
        const saved = localStorage.getItem("theme") || localStorage.getItem("kuicqli_theme");
        if (saved) setTheme(saved);
      }
    };

    window.addEventListener("themeChanged", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);

    return () => {
      window.removeEventListener("themeChanged", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    localStorage.setItem("kuicqli_theme", theme);
  }, [theme]);

  // Inline editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  const [tempName, setTempName] = useState("");
  const [tempUsername, setTempUsername] = useState("");
  const [tempAbout, setTempAbout] = useState("");

  // const currentUserId = userId || localStorage.getItem("userId") || "anonymous";
  const currentUserId =
    userId ||
    localStorage.getItem("userId") ||
    localStorage.getItem("id") ||
    localStorage.getItem("_id") ||
    "anonymous";

  // Helper function to safely get the authentication token
  const getAuthToken = () => {
    return localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("jwt");
  };

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const token = getAuthToken();

        // NOTE: Agar aapke backend ka route /api/auth/profile hai, toh yahan change karein.
        // Agar backend token se user pehchan leta hai, toh userId URL se hatane ki zaroorat pad sakti hai.
        const response = await axios.get(`${API}/api/auth/profile/${currentUserId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},

        });
        // console.log('profile access');

        if (!cancelled && response.data?.success && response.data.profile) {
          const profile = response.data.profile;
          const profileData = {
            name: profile.name || "",
            phone: profile.phone || "",
            bio: profile.bio || profile.about || "",
            username: profile.username || "",
            avatar: profile.avatar || "",
          };
          setFormData(profileData);
          setTempName(profileData.name);
          setTempUsername(profileData.username);
          setTempAbout(profileData.bio);

          if (profile.avatar) {
            const fullAvatar =
              profile.avatar.startsWith("http") ||
                profile.avatar.startsWith("blob:") ||
                profile.avatar.startsWith("data:")
                ? profile.avatar
                : `${API}${profile.avatar.startsWith("/") ? "" : "/"}${profile.avatar}`;
            setPreviewUrl(fullAvatar);
          }
        }
      } catch (err) {
        console.log("No existing profile found or failed to load:", err.message);
        const localProf = localStorage.getItem("userProfile");
        if (localProf) {
          try {
            const parsed = JSON.parse(localProf);
            const profileData = {
              name: parsed.name || "",
              phone: parsed.phone || "",
              bio: parsed.bio || parsed.about || "",
              username: parsed.username || "",
              avatar: parsed.avatar || "",
            };
            setFormData(profileData);
            setTempName(profileData.name);
            setTempUsername(profileData.username);
            setTempAbout(profileData.bio);

            if (parsed.avatar) {
              const fullAvatar =
                parsed.avatar.startsWith("http") ||
                  parsed.avatar.startsWith("blob:") ||
                  parsed.avatar.startsWith("data:")
                  ? parsed.avatar
                  : `${API}${parsed.avatar.startsWith("/") ? "" : "/"}${parsed.avatar}`;
              setPreviewUrl(fullAvatar);
            }
          } catch (e) { }
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError("Image size must not exceed 25 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setError("");

    try {
      setUploading(true);
      const uploadedUrl = await uploadImageToServer(file);
      await saveProfileChanges({ ...formData, avatar: uploadedUrl });
    } catch (err) {
      setError("Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const uploadImageToServer = async (file) => {
    const data = new FormData();
    data.append("file", file);
    const token = getAuthToken();

    const response = await axios.post(`${API}/api/chat/upload`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const resData = response.data;
    const mediaUrl =
      resData?.file?.url ||
      resData?.file?.secureUrl ||
      resData?.secureUrl ||
      resData?.url;

    if (mediaUrl) {
      return mediaUrl.startsWith("http")
        ? mediaUrl
        : `${API}${mediaUrl.startsWith("/") ? "" : "/"}${mediaUrl}`;
    }
    throw new Error("Invalid upload response format from server.");
  };

  const saveProfileChanges = async (updatedData) => {
    try {
      const payload = {
        userId: currentUserId,
        name: updatedData.name.trim(),
        phone: updatedData.phone.trim(),
        bio: updatedData.bio.trim(),
        username: updatedData.username.trim(),
        avatar: updatedData.avatar,
      };

      const token = getAuthToken();
      const response = await axios.post(`${API}/api/auth/save-profile`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.data?.success) {
        setFormData(updatedData);
        const profileObj = {
          name: updatedData.name.trim(),
          bio: updatedData.bio.trim(),
          about: updatedData.bio.trim(),
          avatar: updatedData.avatar,
          phone: updatedData.phone,
          username: updatedData.username.trim(),
        };
        localStorage.setItem("userProfile", JSON.stringify(profileObj));
        localStorage.setItem("userName", updatedData.name.trim());
        localStorage.setItem("userAvatar", updatedData.avatar);

        window.dispatchEvent(
          new CustomEvent("profileUpdated", { detail: profileObj })
        );
        setSuccessMessage("Updated successfully!");
        setTimeout(() => setSuccessMessage(""), 2000);
      } else {
        throw new Error(response.data?.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Profile save error:", err);
      setError(
        err.response?.data?.error || err.message || "Something went wrong."
      );
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    setError("");
    setIsEditingName(false);
    await saveProfileChanges({ ...formData, name: tempName.trim() });
  };

  const handleSaveUsername = async () => {
    setError("");
    setIsEditingUsername(false);
    await saveProfileChanges({ ...formData, username: tempUsername.trim() });
  };

  const handleSaveAbout = async () => {
    setError("");
    setIsEditingAbout(false);
    await saveProfileChanges({ ...formData, bio: tempAbout.trim() });
  };

  const copyPhoneNumber = () => {
    if (formData.phone) {
      navigator.clipboard.writeText(formData.phone);
      setSuccessMessage("Phone number copied!");
      setTimeout(() => setSuccessMessage(""), 2000);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div className={`kuicqli-profile-container ${theme === "dark" ? "dark-theme" : ""}`}>
      <div className="kuicqli-profile-pane">
        <div className="kuicqli-pane-header">
          <div className="header-left">
            <button
              type="button"
              className="kuicqli-back-btn"
              onClick={handleBack}
              aria-label="Back"
            >
              ←
            </button>
            <h2>Edit profile</h2>
          </div>
        </div>

        {error && <div className="kuicqli-alert error">{error}</div>}
        {successMessage && (
          <div className="kuicqli-alert success">{successMessage}</div>
        )}

        <div className="kuicqli-profile-content">
          {/* Avatar Section */}
          <div className="kuicqli-avatar-section">
            <div
              className="kuicqli-avatar-preview"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              title="Change profile picture"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar Preview" />
              ) : (
                <div className="kuicqli-avatar-initials">
                  {getInitials(formData.name)}
                </div>
              )}
              <div className="kuicqli-avatar-overlay">
                <span>{uploading ? "UPLOADING..." : "📷 CHANGE PROFILE PHOTO"}</span>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>

          {/* Name Section */}
          <div className="kuicqli-profile-field-group">
            <div className="kuicqli-field-label">Name</div>
            <div className="kuicqli-field-value-row">
              {isEditingName ? (
                <div className="kuicqli-inline-edit-box">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    autoFocus
                    maxLength={25}
                  />
                  <div className="kuicqli-edit-actions">
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="kuicqli-icon-btn save"
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(false);
                        setTempName(formData.name);
                      }}
                      className="kuicqli-icon-btn cancel"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="kuicqli-field-text">
                    {formData.name || "Add your name"}
                  </span>
                  <button
                    type="button"
                    className="kuicqli-edit-pencil-btn"
                    onClick={() => {
                      setIsEditingName(true);
                      setTempName(formData.name);
                    }}
                    title="Edit name"
                  >
                    ✏️
                  </button>
                </>
              )}
            </div>
          </div>

          {/* About Section */}
          <div className="kuicqli-profile-field-group">
            <div className="kuicqli-field-label">About</div>
            <div className="kuicqli-field-value-row">
              {isEditingAbout ? (
                <div className="kuicqli-inline-edit-box">
                  <input
                    type="text"
                    value={tempAbout}
                    onChange={(e) => setTempAbout(e.target.value)}
                    autoFocus
                    maxLength={130}
                  />
                  <div className="kuicqli-edit-actions">
                    <button
                      type="button"
                      onClick={handleSaveAbout}
                      className="kuicqli-icon-btn save"
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAbout(false);
                        setTempAbout(formData.bio);
                      }}
                      className="kuicqli-icon-btn cancel"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="kuicqli-field-text">
                    {formData.bio || "At work"}
                  </span>
                  <button
                    type="button"
                    className="kuicqli-edit-pencil-btn"
                    onClick={() => {
                      setIsEditingAbout(true);
                      setTempAbout(formData.bio);
                    }}
                    title="Edit about"
                  >
                    ✏️
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Phone Section */}
          <div className="kuicqli-profile-field-group">
            <div className="kuicqli-field-label">Phone</div>
            <div className="kuicqli-field-value-row phone-row">
              <div className="phone-display-wrap">
                <span className="phone-icon">📞</span>
                <span className="kuicqli-field-text">
                  {formData.phone}
                </span>
              </div>
              <button
                type="button"
                className="kuicqli-copy-btn"
                onClick={copyPhoneNumber}
                title="Copy phone number"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;