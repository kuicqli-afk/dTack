import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const uploadMedia = async (file, conversationId, token) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversationId', conversationId);

  const response = await axios.post(`${API_URL}/media/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
};