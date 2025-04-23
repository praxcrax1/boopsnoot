const Chat = require("../models/Chat");

// Track users and their socket IDs
const connectedUsers = new Map();
const userSockets = new Map();

// Helper function to emit match notifications
const emitMatchNotification = (userId, matchData) => {
    const socketId = connectedUsers.get(userId.toString());
    
    if (socketId) {
        console.log(`Emitting match notification to user ${userId} via socket ${socketId}`);
        global.io.to(socketId).emit('match_created', matchData);
    } else {
        console.log(`User ${userId} is not connected to receive match notification`);
        // Could implement offline notifications here
    }
};

const setupSocketIO = (io) => {
    // Store io instance globally to use in other functions
    global.io = io;

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        // Handle user authentication
        socket.on("authenticate", (data) => {
            if (data && data.userId) {
                // Store both mappings for quick lookup
                connectedUsers.set(data.userId, socket.id);
                userSockets.set(socket.id, data.userId);

                console.log(
                    `User ${data.userId} authenticated with socket ${socket.id}`
                );
                socket.userId = data.userId; // Store userId in socket object for reference
            }
        });

        // Join a chat room
        socket.on("join_chat", (chatId) => {
            // Make sure chatId is a string
            const roomId = typeof chatId === "object" ? chatId.chatId : chatId;
            socket.join(roomId);
            console.log(
                `User ${socket.id} (userId: ${
                    socket.userId || "unknown"
                }) joined chat: ${roomId}`
            );
        });

        // Also support the alternate event name format
        socket.on("join-chat", (data) => {
            const roomId = typeof data === "object" ? data.chatId : data;
            socket.join(roomId);
            console.log(`User ${socket.id} joined chat: ${roomId} (alt format)`);
        });

        // Send message
        socket.on("send_message", async (data) => {
            // Make handler async
            console.log("Message received from client:", data);

            const senderId =
                data.senderId || socket.userId || (data.sender && data.sender._id);
            const chatId = data.chatId;

            if (!chatId || !senderId) {
                console.error("Missing chatId or senderId in send_message:", data);
                // Optionally emit an error back to the sender
                // socket.emit('message_error', { message: 'Missing chat or sender info' });
                return;
            }

            try {
                // Find the chat to get participants
                const chat = await Chat.findById(chatId);
                if (!chat) {
                    console.error(`Chat not found for ID: ${chatId}`);
                    // socket.emit('message_error', { message: 'Chat room not found' });
                    return;
                }

                // Prepare the message data to be sent
                const messageData = {
                    ...data,
                    senderSocketId: socket.id,
                    senderUserId: senderId,
                    // Ensure sender info is consistent
                    sender: {
                        ...(data.sender || {}),
                        _id: senderId, // Make sure sender ID is present
                        isCurrentUser: false, // This will be determined by the receiver
                    },
                };

                console.log(
                    "Attempting to broadcast message to participants of chat:",
                    chatId
                );

                // Iterate over participants and send to their connected sockets
                chat.participants.forEach((participantId) => {
                    const recipientSocketId = connectedUsers.get(
                        participantId.toString()
                    );

                    // Don't send back to the original sender's socket immediately
                    // The frontend ChatScreen handles adding the message locally.
                    // However, if the sender has multiple sessions, they *should* receive it.
                    // The frontend listener already filters messages where senderId === currentUserId.
                    // So, we can safely emit to all participants' sockets.

                    if (recipientSocketId) {
                        console.log(
                            `Sending message to participant ${participantId} via socket ${recipientSocketId}`
                        );
                        // Emit the message directly to the recipient's socket
                        io.to(recipientSocketId).emit(
                            "receive_message",
                            messageData
                        );
                    } else {
                        console.log(
                            `Participant ${participantId} is not currently connected.`
                        );
                        // TODO: Implement offline handling / push notifications here if needed
                        // This is where you'd trigger a push notification if the user is offline
                    }
                });
            } catch (error) {
                console.error("Error processing send_message:", error);
                // socket.emit('message_error', { message: 'Server error processing message' });
            }
        });

        // Disconnect
        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);

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
};

module.exports = {
    setupSocketIO,
    emitMatchNotification
};