const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Match = require('../models/Match');
const Pet = require('../models/Pet');
const { protect } = require('../middleware/auth');

// @route   GET /api/chats
// @desc    Get all chats for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Find all chats where the user is a participant
    const chats = await Chat.find({
      participants: req.user.id,
      isActive: true
    })
      .populate('match')
      .populate({
        path: 'lastMessage',
        select: 'content createdAt sender'
      })
      .sort({ 'lastMessage.createdAt': -1 });

    // Prepare response data
    const chatData = await Promise.all(chats.map(async (chat) => {
      try {
        // Find the other participant
        const otherParticipantId = chat.participants.find(
          p => p.toString() !== req.user.id
        );

        if (!chat.match) {
          console.error('Match not found for chat:', chat._id);
          return null;
        }

        // Get match data and pet info with owner fields
        const match = await Match.findById(chat.match)
          .populate('pet1', 'name photos owner')
          .populate('pet2', 'name photos owner');

        if (!match) {
          console.error('Match could not be populated:', chat.match);
          return null;
        }

        if (!match.pet1 || !match.pet2) {
          console.error('One or both pets missing from match:', match._id);
          return null;
        }

        // Get pet owner details directly from Pet model if needed
        let myPet, otherPet;

        // Find which pet belongs to which user
        if (match.pet1.owner && match.pet2.owner) {
          // If owner is populated as an object (referenced)
          if (typeof match.pet1.owner === 'object') {
            myPet = match.pet1.owner._id.toString() === req.user.id ? match.pet1 : match.pet2;
            otherPet = match.pet1.owner._id.toString() === req.user.id ? match.pet2 : match.pet1;
          } else {
            // If owner is a string (ObjectID)
            myPet = match.pet1.owner.toString() === req.user.id ? match.pet1 : match.pet2;
            otherPet = match.pet1.owner.toString() === req.user.id ? match.pet2 : match.pet1;
          }
        } else {
          // Fallback: fetch pets directly with owner info
          const pet1 = await Pet.findById(match.pet1._id).select('name photos owner');
          const pet2 = await Pet.findById(match.pet2._id).select('name photos owner');
          
          if (!pet1 || !pet2) {
            console.error('Could not retrieve pet information');
            return null;
          }
          
          myPet = pet1.owner.toString() === req.user.id ? pet1 : pet2;
          otherPet = pet1.owner.toString() === req.user.id ? pet2 : pet1;
        }

        return {
          _id: chat._id,
          matchId: chat.match._id,
          participants: [
            {
              pet: {
                _id: myPet._id,
                name: myPet.name,
                photos: myPet.photos
              },
              isCurrentUser: true
            },
            {
              pet: {
                _id: otherPet._id,
                name: otherPet.name,
                photos: otherPet.photos
              },
              isCurrentUser: false
            }
          ],
          lastMessage: chat.lastMessage ? {
            content: chat.lastMessage.content,
            createdAt: chat.lastMessage.createdAt,
            unread: false // Would need more logic to determine if unread
          } : null,
          createdAt: chat.createdAt
        };
      } catch (error) {
        console.error('Error processing chat:', error);
        return null;
      }
    }));

    // Filter out any nulls (in case a match was deleted or there was an error)
    const validChats = chatData.filter(chat => chat !== null);

    res.json({
      success: true,
      count: validChats.length,
      chats: validChats
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/chats/:id
// @desc    Get single chat by ID with messages
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, before } = req.query;

    // Find chat and ensure user is a participant
    const chat = await Chat.findOne({
      _id: id,
      participants: req.user.id
    }).populate('match');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or you are not a participant'
      });
    }

    // Get match data with pets
    const match = await Match.findById(chat.match)
      .populate('pet1', 'name photos owner')
      .populate('pet2', 'name photos owner');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match associated with this chat not found'
      });
    }

    // Determine which pet belongs to which user
    let myPet, otherPet;
    
    // Get pet owner details directly from Pet model if needed
    const pet1 = await Pet.findById(match.pet1._id).select('name photos owner');
    const pet2 = await Pet.findById(match.pet2._id).select('name photos owner');
    
    if (!pet1 || !pet2) {
      return res.status(404).json({
        success: false,
        message: 'Pet information not found'
      });
    }
    
    myPet = pet1.owner.toString() === req.user.id ? pet1 : pet2;
    otherPet = pet1.owner.toString() === req.user.id ? pet2 : pet1;

    // Build query for messages
    let messagesQuery = Message.find({ chat: id });
    
    // If before parameter is provided, get messages before that date
    if (before) {
      messagesQuery = messagesQuery.where('createdAt').lt(new Date(before));
    }
    
    // Get messages
    const messages = await messagesQuery
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('sender', 'name profilePicture');

    // Format messages with sender info
    const formattedMessages = messages.reverse().map(message => {
      const isCurrentUser = message.sender._id.toString() === req.user.id;
      return {
        _id: message._id,
        content: message.content,
        createdAt: message.createdAt,
        sender: {
          isCurrentUser: isCurrentUser
        },
        attachments: message.attachments || []
      };
    });

    // Mark messages as read
    await Message.updateMany(
      { 
        chat: id, 
        sender: { $ne: req.user.id },
        'readBy.user': { $ne: req.user.id }
      },
      {
        $push: {
          readBy: {
            user: req.user.id,
            readAt: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      chat: {
        _id: chat._id,
        participants: [
          {
            pet: {
              _id: myPet._id,
              name: myPet.name,
              photos: myPet.photos
            },
            isCurrentUser: true
          },
          {
            pet: {
              _id: otherPet._id,
              name: otherPet.name,
              photos: otherPet.photos
            },
            isCurrentUser: false
          }
        ],
        createdAt: chat.createdAt
      },
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/chats/:id/messages
// @desc    Send a message in a chat
// @access  Private
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, attachments } = req.body;

    // Validate input
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Message must have content or attachments'
      });
    }

    // Find chat and ensure user is a participant
    const chat = await Chat.findOne({
      _id: id,
      participants: req.user.id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or you are not a participant'
      });
    }

    // Create message
    const message = new Message({
      chat: id,
      sender: req.user.id,
      content: content || '',
      attachments: attachments || [],
      readBy: [{
        user: req.user.id,
        readAt: new Date()
      }]
    });

    const savedMessage = await message.save();

    // Update last message in chat
    chat.lastMessage = savedMessage._id;
    await chat.save();

    // Format response
    const messageResponse = {
      _id: savedMessage._id,
      content: savedMessage.content,
      createdAt: savedMessage.createdAt,
      sender: {
        isCurrentUser: true
      },
      attachments: savedMessage.attachments || []
    };

    res.status(201).json({
      success: true,
      message: messageResponse
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/chats/for-match
// @desc    Get or create a chat for a specific match
// @access  Private
router.post('/for-match', protect, async (req, res) => {
  try {
    const { matchId } = req.body;
    
    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'Match ID is required'
      });
    }

    // First, check if a chat already exists for this match
    let chat = await Chat.findOne({ 
      match: matchId,
      isActive: true 
    });

    if (!chat) {
      // If no chat exists, get the match to create one
      const match = await Match.findById(matchId);
      
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      // Ensure current user is a participant in this match
      if (!match.participants.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant in this match'
        });
      }

      // Create a new chat for this match
      chat = new Chat({
        match: matchId,
        participants: match.participants,
        isActive: true
      });

      await chat.save();
    }

    // Get full chat details with participants
    const populatedChat = await Chat.findById(chat._id)
      .populate('match')
      .populate({
        path: 'lastMessage',
        select: 'content createdAt sender'
      });

    // Format response similar to the getChats endpoint
    const otherParticipantId = populatedChat.participants.find(
      p => p.toString() !== req.user.id
    );

    // Get user's pet info
    const myPet = await Pet.findOne({ owner: req.user.id });
    
    // Get other user's pet info
    const otherPet = await Pet.findOne({ owner: otherParticipantId });

    const chatData = {
      _id: populatedChat._id,
      matchId: populatedChat.match._id,
      participants: [
        {
          pet: {
            _id: myPet._id,
            name: myPet.name,
            photos: myPet.photos
          },
          isCurrentUser: true
        },
        {
          pet: {
            _id: otherPet._id,
            name: otherPet.name,
            photos: otherPet.photos
          },
          isCurrentUser: false
        }
      ],
      lastMessage: populatedChat.lastMessage ? {
        content: populatedChat.lastMessage.content,
        createdAt: populatedChat.lastMessage.createdAt,
        unread: false
      } : null,
      createdAt: populatedChat.createdAt
    };

    // Get messages
    const messages = await Message.find({ chat: chat._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      chat: chatData,
      messages: messages.reverse() // reverse to get chronological order
    });
  } catch (error) {
    console.error('Error in get/create chat for match:', error);
    res.status(500).json({
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;