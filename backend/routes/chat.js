const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// @route   GET /api/chats
// @desc    Get all chats for the current user
// @access  Private
router.get('/', protect, chatController.getUserChats);

// @route   GET /api/chats/:id
// @desc    Get single chat by ID with messages
// @access  Private
router.get('/:id', protect, chatController.getChatById);

// @route   POST /api/chats/:id/messages
// @desc    Send a message in a chat
// @access  Private
router.post('/:id/messages', protect, chatController.sendMessage);

// @route   POST /api/chats/for-match
// @desc    Get or create a chat for a specific match
// @access  Private
router.post('/for-match', protect, chatController.getChatForMatch);

module.exports = router;