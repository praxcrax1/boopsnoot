const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const petRoutes = require('./routes/pet');
const matchRoutes = require('./routes/match');
const chatRoutes = require('./routes/chat');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, replace with actual frontend URL
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/boopsnoot')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chats', chatRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('BoopSnoot API is running');
});

// Socket.io setup for real-time chat
// Track users and their socket IDs
const connectedUsers = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle user authentication
  socket.on('authenticate', (data) => {
    if (data && data.userId) {
      // Store both mappings for quick lookup
      connectedUsers.set(data.userId, socket.id); 
      userSockets.set(socket.id, data.userId);
      
      console.log(`User ${data.userId} authenticated with socket ${socket.id}`);
      socket.userId = data.userId; // Store userId in socket object for reference
    }
  });
  
  // Join a chat room
  socket.on('join_chat', (chatId) => {
    // Make sure chatId is a string
    const roomId = typeof chatId === 'object' ? chatId.chatId : chatId;
    socket.join(roomId);
    console.log(`User ${socket.id} (userId: ${socket.userId || 'unknown'}) joined chat: ${roomId}`);
  });
  
  // Also support the alternate event name format
  socket.on('join-chat', (data) => {
    const roomId = typeof data === 'object' ? data.chatId : data;
    socket.join(roomId);
    console.log(`User ${socket.id} joined chat: ${roomId} (alt format)`);
  });
  
  // Send message
  socket.on('send_message', (data) => {
    console.log('Message received from client:', data);
    
    // Get the sender's user ID
    const senderId = data.senderId || socket.userId || (data.sender && data.sender._id);
    
    // Make sure we have the sender's user ID stored in the message data
    const messageData = {
      ...data,
      senderSocketId: socket.id,
      senderUserId: senderId,
      // When sending to others, explicitly mark as NOT from the current user (receiver's perspective)
      sender: {
        ...data.sender,
        isCurrentUser: false  // This is critical - when someone else receives a message, it's not from them
      }
    };
    
    console.log('Broadcasting message to room:', messageData.chatId, 'Message data:', messageData);
    
    // Broadcast to all clients in the chat room including the sender ID
    const chatId = data.chatId;
    socket.to(chatId).emit('receive_message', messageData);
  });
  
  // Support alternate event name format
  socket.on('message', (data) => {
    console.log('Message received (alt format):', data);
    
    // Get the sender's user ID
    const senderId = data.senderId || socket.userId || (data.sender && data.sender._id);
    
    const messageData = {
      ...data,
      senderSocketId: socket.id,
      senderUserId: senderId,
      // When sending to others, explicitly mark as NOT from the current user (receiver's perspective)
      sender: {
        ...data.sender,
        isCurrentUser: false  // When receiving a message, it's always from someone else
      }
    };
    
    const chatId = data.chatId;
    socket.to(chatId).emit('receive_message', messageData);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from connected users maps
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
    
    const userId = userSockets.get(socket.id);
    if (userId) {
      userSockets.delete(socket.id);
      connectedUsers.delete(userId);
    }
  });
});

// Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
