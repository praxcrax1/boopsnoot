import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

// Base URL for API requests - change this to your actual backend URL
// For local development, use your computer's local IP address instead of localhost
// Example: const API_URL = 'http://192.168.1.100:5000/api';
const API_URL = 'http://192.168.137.1:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token in requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Socket service for real-time communication
export const socketService = {
  socket: null,
  
  connect() {
    if (!this.socket) {
      this.socket = io(API_URL, {
        auth: async (cb) => {
          const token = await AsyncStorage.getItem('token');
          cb({ token });
        },
      });
      
      this.socket.on('connect', () => {
        console.log('Socket connected');
      });
      
      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
      
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    }
    
    return this.socket;
  },
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  },
  
  joinChat(chatId) {
    if (this.socket) {
      this.socket.emit('join-chat', { chatId });
    }
  },
  
  onReceiveMessage(callback) {
    if (this.socket) {
      this.socket.on('message', callback);
    }
  },
};

// Authentication service
export const authService = {
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      await AsyncStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      await AsyncStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async logout() {
    try {
      await AsyncStorage.removeItem('token');
      socketService.disconnect();
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  },
  
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async isAuthenticated() {
    const token = await AsyncStorage.getItem('token');
    return !!token;
  },
};

// Pet service
export const petService = {
  async createPet(petData) {
    try {
      const response = await apiClient.post('/pets', petData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async getUserPets() {
    try {
      const response = await apiClient.get('/pets');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async getPetById(petId) {
    try {
      const response = await apiClient.get(`/pets/${petId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async updatePet(petId, petData) {
    try {
      const response = await apiClient.put(`/pets/${petId}`, petData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async deletePet(petId) {
    try {
      const response = await apiClient.delete(`/pets/${petId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Match service
export const matchService = {
  async getPotentialMatches(filters = {}, petId) {
    try {
      const response = await apiClient.get(`/matches/potential/${petId}`, { params: filters });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async likeProfile(petId, likedPetId) {
    try {
      const response = await apiClient.post('/matches/like', {
        petId,
        likedPetId,
        isLiked: true
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async passProfile(petId, likedPetId) {
    try {
      const response = await apiClient.post('/matches/like', {
        petId,
        likedPetId,
        isLiked: false
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async getUserMatches(petId) {
    try {
      const response = await apiClient.get(`/matches/${petId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Chat service
export const chatService = {
  async getChats() {
    try {
      const response = await apiClient.get('/chats');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async getChatById(chatId) {
    try {
      const response = await apiClient.get(`/chats/${chatId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async getMessages(chatId, params = {}) {
    try {
      // Use the same endpoint as getChatById since it already includes messages
      const response = await apiClient.get(`/chats/${chatId}`, {
        params: {
          limit: params.limit || 30,
          before: params.before,
        },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async sendMessage(chatId, content) {
    try {
      const response = await apiClient.post(`/chats/${chatId}/messages`, { content });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Helper function to standardize error handling
function handleApiError(error) {
  let errorMessage = 'An unexpected error occurred';
  
  if (error.response) {
    // Server responded with a status code outside the 2xx range
    const serverError = error.response.data;
    errorMessage = serverError.message || String(serverError);
    
    // Log additional details for debugging
    console.error('API Error:', {
      status: error.response.status,
      data: error.response.data,
      url: error.config?.url,
    });
  } else if (error.request) {
    // Request was made but no response received
    errorMessage = 'No response from server. Please check your internet connection.';
    console.error('API No Response:', error.request);
  } else {
    // Request setup error
    errorMessage = error.message;
    console.error('API Setup Error:', error.message);
  }
  
  return new Error(errorMessage);
}

export default {
  authService,
  petService,
  matchService,
  chatService,
  socketService,
};