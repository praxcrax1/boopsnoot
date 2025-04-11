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
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Join a chat room
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat: ${chatId}`);
  });
  
  // Send message
  socket.on('send_message', (data) => {
    socket.to(data.chatId).emit('receive_message', data);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
