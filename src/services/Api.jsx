import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// ============================================
// STORE / ADMIN INFO
// ============================================
export const getStoreInfo = async () => {
  try {
    const token = localStorage.getItem("token");
    // Yahan API_URL use karein taaki URL sahi ban sake
    const response = await axios.get(`${API_URL}/admin/auth/store-info`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching store info:", error);
    throw error;
  }
};  

// ============================================
// AUTH
// ============================================
export const sendOTP = (phone) => 
  axios.post(`${API_URL}/auth/send-otp`, { phone });

export const verifyOTP = (phone, otp) => 
  axios.post(`${API_URL}/auth/verify-otp`, { phone, otp });

// ============================================
// USERS / CONTACTS
// ============================================
export const getContacts = async (userId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API}/api/admin/auth/store-info`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw error;
  }
};

export const getUser = (id) => 
  axios.get(`${API_URL}/auth/${id}`);

// ============================================
// MESSAGES
// ============================================
export const sendMessage = (data) => 
  axios.post(`${API_URL}/messages`, data);

export const getMessages = (userId, contactId) => 
  axios.get(`${API_URL}/messages/${userId}/${contactId}`);

export const getConversations = (userId) => 
  axios.get(`${API_URL}/messages/conversations/${userId}`);

// ============================================
// MEDIA UPLOAD (Image/File) ✅ FIXED
// ============================================
export const uploadMedia = async (file, sessionId, token) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionId', sessionId);

  try {
    const response = await axios.post(`${API_URL}/chat/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('❌ Upload error:', error.response?.data || error.message);
    throw error;
  }
};

// ============================================
// CHAT
// ============================================
export const sendChatMessage = (message, sessionId) => 
  axios.post(`${API_URL}/chat`, { message, sessionId });

export const getChatHistory = (sessionId) => 
  axios.get(`${API_URL}/chat/history/${sessionId}`);

export default {
  sendOTP,
  verifyOTP,
  getContacts,
  getUser,
  sendMessage,
  getMessages,
  getConversations,
  uploadMedia,
  sendChatMessage,
  getChatHistory,
  getStoreInfo
};