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
  currentUserId: null,
  isConnecting: false,
  
  async getCurrentUser() {
    if (!this.currentUserId) {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          this.currentUserId = parsedUser.id || parsedUser._id;
          console.log('Got current user ID:', this.currentUserId);
        }
      } catch (error) {
        console.error('Error getting current user ID:', error);
      }
    }
    return this.currentUserId;
  },
  
  async connect() {
    // Prevent multiple connection attempts
    if (this.isConnecting) {
      console.log('Connection already in progress, waiting...');
      let attempts = 0;
      while (!this.socket && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        attempts++;
      }
      return this.socket;
    }
    
    // If socket exists and is connected, return it
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected:', this.socket.id);
      return this.socket;
    }
    
    this.isConnecting = true;
    console.log('Starting socket connection process');
    
    try {
      // Get current user ID
      await this.getCurrentUser();
      
      // Use the base URL, not the API URL (remove /api)
      const SOCKET_URL = API_URL.replace('/api', '');
      
      console.log('Connecting to socket at:', SOCKET_URL);
      
      // Create new socket connection
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        timeout: 10000,
        auth: async (cb) => {
          try {
            const token = await AsyncStorage.getItem('token');
            cb({ token });
          } catch (err) {
            console.error('Socket auth error:', err);
            cb({});
          }
        },
      });
      
      // Set up connection event handlers
      this.socket.on('connect', () => {
        console.log('Socket connected with ID:', this.socket.id);
        
        // Authenticate the socket with user ID
        if (this.currentUserId) {
          this.socket.emit('authenticate', { userId: this.currentUserId });
          console.log('Authenticated socket with user ID:', this.currentUserId);
        } else {
          console.warn('No user ID available for socket authentication');
          // Try to get user ID if not available
          this.getCurrentUser().then(userId => {
            if (userId) {
              this.socket.emit('authenticate', { userId });
              console.log('Delayed authentication with user ID:', userId);
            }
          });
        }
      });
      
      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected, reason:', reason);
        
        // Auto reconnect if disconnected unexpectedly
        if (reason === 'io server disconnect' || reason === 'transport close') {
          this.socket.connect();
        }
      });
      
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
      
      // Wait for connection to establish
      if (!this.socket.connected) {
        console.log('Waiting for socket connection...');
        await new Promise((resolve) => {
          const connectTimeout = setTimeout(() => {
            console.log('Socket connection timed out');
            resolve();
          }, 5000);
          
          this.socket.once('connect', () => {
            clearTimeout(connectTimeout);
            console.log('Socket connected in wait period');
            resolve();
          });
        });
      }
    } catch (error) {
      console.error('Socket connection error:', error);
    } finally {
      this.isConnecting = false;
    }
    
    return this.socket;
  },
  
  disconnect() {
    if (this.socket) {
      console.log('Manually disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
    }
  },
  
  async joinChat(chatId) {
    try {
      console.log('Attempting to join chat room:', chatId);
      
      // Make sure socket is connected before joining chat
      if (!this.socket || !this.socket.connected) {
        console.log('Socket not connected, connecting now...');
        await this.connect();
        // Add a small delay to ensure connection is fully established
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Double check the connection
      if (!this.socket) {
        console.error('Cannot join chat: socket is null after connection attempt');
        return false;
      }
      
      if (!this.socket.connected) {
        console.error('Cannot join chat: socket not connected after connection attempt');
        return false;
      }
      
      console.log('Successfully joining chat room:', chatId);
      this.socket.emit('join_chat', chatId);
      return true;
    } catch (error) {
      console.error('Error joining chat:', error);
      return false;
    }
  },
  
  leaveChat(chatId) {
    if (this.socket && this.socket.connected) {
      console.log('Leaving chat room:', chatId);
      this.socket.emit('leave_chat', chatId);
    }
  },
  
  async sendMessage(messageData) {
    try {
      // Ensure socket is connected
      if (!this.socket || !this.socket.connected) {
        console.log('Socket not connected, connecting before sending message...');
        await this.connect();
        // Add a small delay to ensure connection is fully established
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket not connected after reconnection attempt');
      }
      
      // Make sure we have the current user ID
      if (!this.currentUserId) {
        await this.getCurrentUser();
      }
      
      console.log('Emitting message to room:', messageData.chatId, 'with user ID:', this.currentUserId);
      
      // Make sure we include the current user ID with the message
      const messageWithSender = {
        ...messageData,
        senderId: this.currentUserId
      };
      
      // Use the correct event name that matches the backend
      this.socket.emit('send_message', messageWithSender);
      return true;
    } catch (error) {
      console.error('Error sending message via socket:', error);
      return false;
    }
  },
  
  async onReceiveMessage(callback) {
    try {
      // Ensure socket is connected
      if (!this.socket) {
        await this.connect();
      }
      
      // Make sure we have the current user ID
      if (!this.currentUserId) {
        await this.getCurrentUser();
      }
      
      // Remove any existing listeners to avoid duplicates
      if (this.socket) {
        this.socket.off('receive_message');
        
        // Use the correct event name that matches the backend
        this.socket.on('receive_message', (data) => {
          console.log('Received message:', data, 'Current user:', this.currentUserId);
          
          // Determine if the sender is the current user
          const isCurrentUser = 
            data.senderId === this.currentUserId || 
            data.senderUserId === this.currentUserId ||
            (data.sender && (data.sender._id === this.currentUserId || data.sender.isCurrentUser));
          
          // Create a standardized message format to ensure consistency
          const standardizedMessage = {
            ...data,
            sender: { 
              ...data.sender,
              isCurrentUser: isCurrentUser
            }
          };
          
          callback(standardizedMessage);
        });
      } else {
        console.error('Cannot set up message listener: socket not initialized');
      }
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }
  },
  
  offReceiveMessage() {
    if (this.socket) {
      this.socket.off('receive_message');
    }
  }
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
  // Cache for storing pet matches
  _matchesCache: {},
  _cacheTimeout: 60000, // 1 minute cache timeout
  _cacheTimestamps: {},
  
  // Clear cache for specific pet or all pets
  clearCache(petId = null) {
    if (petId) {
      delete this._matchesCache[petId];
      delete this._cacheTimestamps[petId];
    } else {
      this._matchesCache = {};
      this._cacheTimestamps = {};
    }
  },
  
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
      
      // Clear cache after liking to ensure fresh data
      this.clearCache(petId);
      
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
      // Check if we have a valid cached response
      const now = Date.now();
      if (
        this._matchesCache[petId] && 
        this._cacheTimestamps[petId] && 
        now - this._cacheTimestamps[petId] < this._cacheTimeout
      ) {
        console.log(`[API] Returning cached matches for pet ${petId}`);
        return this._matchesCache[petId];
      }
      
      console.log(`[API] Fetching fresh matches for pet ${petId}`);
      const response = await apiClient.get(`/matches/${petId}`);
      
      // Cache the response
      this._matchesCache[petId] = response.data;
      this._cacheTimestamps[petId] = now;
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  // Method to preload matches for multiple pets in the background
  async preloadMatchesForPets(petIds) {
    if (!Array.isArray(petIds) || petIds.length === 0) return;
    
    console.log(`[API] Preloading matches for ${petIds.length} pets`);
    
    // Map each pet ID to a promise that will fetch its matches
    const fetchPromises = petIds.map(petId => 
      this.getUserMatches(petId)
        .catch(err => {
          console.error(`Failed to preload matches for pet ${petId}:`, err);
          return null;
        })
    );
    
    // Wait for all preloads to complete
    await Promise.all(fetchPromises);
    console.log('[API] Preloading complete');
  }
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

  async getOrCreateChatForMatch(matchId) {
    try {
      // First try to find an existing chat for this match
      const response = await apiClient.post('/chats/for-match', { matchId });
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