import AsyncStorage from "@react-native-async-storage/async-storage";
import io from "socket.io-client";
import { SOCKET_URL } from "../constants/apiConfig";
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { navigationRef } from '../../App';

class SocketService {
    socket = null;
    currentUserId = null;
    isConnecting = false;
    globalMessageListeners = new Set();
    matchNotificationListeners = new Set();
    chatRemovalListeners = new Set(); // New set for chat removal notification listeners

    async getCurrentUser() {
        if (!this.currentUserId) {
            try {
                const userData = await AsyncStorage.getItem("user");
                if (userData) {
                    const parsedUser = JSON.parse(userData);
                    this.currentUserId = parsedUser.id || parsedUser._id;
                    console.log("Got current user ID:", this.currentUserId);
                }
            } catch (error) {
                console.error("Error getting current user ID:", error);
            }
        }
        return this.currentUserId;
    }

    async connect() {
        if (this.isConnecting) {
            console.log("Connection already in progress, waiting...");
            let attempts = 0;
            while (!this.socket && attempts < 10) {
                await new Promise((resolve) => setTimeout(resolve, 300));
                attempts++;
            }
            return this.socket;
        }

        if (this.socket && this.socket.connected) {
            console.log("Socket already connected:", this.socket.id);
            return this.socket;
        }

        this.isConnecting = true;
        console.log("Starting socket connection process");

        try {
            await this.getCurrentUser();

            console.log("Connecting to socket at:", SOCKET_URL);

            this.socket = io(SOCKET_URL, {
                transports: ["websocket"],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 10,
                timeout: 10000,
                auth: async (cb) => {
                    try {
                        const token = await AsyncStorage.getItem("token");
                        cb({ token });
                    } catch (err) {
                        console.error("Socket auth error:", err);
                        cb({});
                    }
                },
            });

            this.socket.on("connect", () => {
                console.log("Socket connected with ID:", this.socket.id);

                if (this.currentUserId) {
                    this.socket.emit("authenticate", {
                        userId: this.currentUserId,
                    });
                    console.log(
                        "Authenticated socket with user ID:",
                        this.currentUserId
                    );
                } else {
                    console.warn(
                        "No user ID available for socket authentication"
                    );
                    this.getCurrentUser().then((userId) => {
                        if (userId) {
                            this.socket.emit("authenticate", { userId });
                            console.log(
                                "Delayed authentication with user ID:",
                                userId
                            );
                        }
                    });
                }
            });

            this.socket.on("connect_error", (err) => {
                console.error("Socket connection error:", err.message);
            });

            this.socket.on("disconnect", (reason) => {
                console.log("Socket disconnected, reason:", reason);

                if (
                    reason === "io server disconnect" ||
                    reason === "transport close"
                ) {
                    this.socket.connect();
                }
            });

            this.socket.on("error", (error) => {
                console.error("Socket error:", error);
            });

            this.setupGlobalMessageListener();
            this.setupMatchNotificationListener();
            this.setupChatRemovalListener(); // Set up the chat removal listener

            if (!this.socket.connected) {
                console.log("Waiting for socket connection...");
                await new Promise((resolve) => {
                    const connectTimeout = setTimeout(() => {
                        console.log("Socket connection timed out");
                        resolve();
                    }, 5000);

                    this.socket.once("connect", () => {
                        clearTimeout(connectTimeout);
                        console.log("Socket connected in wait period");
                        resolve();
                    });
                });
            }
        } catch (error) {
            console.error("Socket connection error:", error);
        } finally {
            this.isConnecting = false;
        }

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            console.log("Manually disconnecting socket");
            this.socket.disconnect();
            this.socket = null;
        }
    }

    async joinChat(chatId) {
        try {
            console.log("Attempting to join chat room:", chatId);

            if (!this.socket || !this.socket.connected) {
                console.log("Socket not connected, connecting now...");
                await this.connect();
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            if (!this.socket) {
                console.error(
                    "Cannot join chat: socket is null after connection attempt"
                );
                return false;
            }

            if (!this.socket.connected) {
                console.error(
                    "Cannot join chat: socket not connected after connection attempt"
                );
                return false;
            }

            console.log("Successfully joining chat room:", chatId);
            this.socket.emit("join_chat", chatId);
            return true;
        } catch (error) {
            console.error("Error joining chat:", error);
            return false;
        }
    }

    leaveChat(chatId) {
        if (this.socket && this.socket.connected) {
            console.log("Leaving chat room:", chatId);
            this.socket.emit("leave_chat", chatId);
        }
    }

    async sendMessage(messageData) {
        try {
            if (!this.socket || !this.socket.connected) {
                console.log(
                    "Socket not connected, connecting before sending message..."
                );
                await this.connect();
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            if (!this.socket || !this.socket.connected) {
                throw new Error(
                    "Socket not connected after reconnection attempt"
                );
            }

            if (!this.currentUserId) {
                await this.getCurrentUser();
            }

            console.log(
                "Emitting message to room:",
                messageData.chatId,
                "with user ID:",
                this.currentUserId
            );

            const messageWithSender = {
                ...messageData,
                senderId: this.currentUserId,
            };

            this.socket.emit("send_message", messageWithSender);
            return true;
        } catch (error) {
            console.error("Error sending message via socket:", error);
            return false;
        }
    }

    addGlobalMessageListener(callback) {
        this.globalMessageListeners.add(callback);
        console.log("Added global listener. Count:", this.globalMessageListeners.size);
    }

    removeGlobalMessageListener(callback) {
        this.globalMessageListeners.delete(callback);
        console.log("Removed global listener. Count:", this.globalMessageListeners.size);
    }

    notifyGlobalListeners(message) {
        console.log(`[SocketService LOG] Notifying ${this.globalMessageListeners.size} global listeners.`);
        if (this.globalMessageListeners.size === 0) {
            console.warn("[SocketService LOG] No global listeners registered to notify!");
        }
        this.globalMessageListeners.forEach(listener => {
            try {
                console.log("[SocketService LOG] Calling a global listener function.");
                listener(message);
            } catch (error) {
                console.error("[SocketService LOG] Error in global message listener:", error);
            }
        });
    }

    setupGlobalMessageListener() {
        if (!this.socket) {
            console.error("Cannot set up global message listener: socket not initialized");
            return;
        }

        this.socket.off("receive_message");

        this.socket.on("receive_message", async (data) => {
            console.log(
                "[SocketService LOG] Raw message received on 'receive_message':",
                JSON.stringify(data, null, 2)
            );

            if (!this.currentUserId) {
                await this.getCurrentUser();
            }

            const senderId = data.senderUserId || data.senderId || data.sender?._id;
            const isCurrentUser = senderId === this.currentUserId;

            if (isCurrentUser) {
                console.log("[SocketService LOG] Ignoring message from self.");
                return;
            }

            const standardizedMessage = {
                ...data,
                sender: {
                    ...(data.sender || {}),
                    _id: senderId,
                    isCurrentUser: false,
                },
            };

            console.log("[SocketService LOG] Preparing to notify global listeners with message:", JSON.stringify(standardizedMessage, null, 2));
            this.notifyGlobalListeners(standardizedMessage);
            
            // Create local notification for the received message
            this.createLocalNotification(standardizedMessage);
        });

        console.log("[SocketService LOG] Global 'receive_message' listener setup complete.");
    }

    async createLocalNotification(message) {
        try {
            // Check if app is in foreground and user is already in the specific chat
            const appState = AppState.currentState;
            const currentRoute = navigationRef.current?.getCurrentRoute?.();
            const chatId = message.chatId;
            
            // Only show notification if NOT already in the chat screen with this chatId
            const isOnRelevantChatScreen = 
                appState === 'active' && 
                currentRoute?.name === 'Chat' && 
                currentRoute.params?.chatId === chatId;

            if (isOnRelevantChatScreen) {
                console.log("[SocketService LOG] User already in chat, skipping notification");
                return;
            }

            // Get sender name or use a default
            const senderName = message.sender?.name || message.sender?.username || "Someone";
            
            // Create notification content
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `${senderName} sent a message`,
                    body: message.text || "New message received",
                    data: { chatId: chatId, messageId: message._id },
                    sound: true,
                },
                trigger: null, // Show immediately
            });
            
            console.log("[SocketService LOG] Local notification created for message");
        } catch (error) {
            console.error("[SocketService LOG] Error creating notification:", error);
        }
    }

    async onReceiveMessage(callback) {
       console.warn("SocketService.onReceiveMessage is potentially deprecated. Use addGlobalMessageListener instead.");
       this.addGlobalMessageListener(callback);
    }

    offReceiveMessage(callback) {
       console.warn("SocketService.offReceiveMessage is potentially deprecated. Use removeGlobalMessageListener instead.");
       this.removeGlobalMessageListener(callback);
    }

    // Match notification listeners
    addMatchNotificationListener(callback) {
        this.matchNotificationListeners.add(callback);
        console.log("Added match notification listener. Count:", this.matchNotificationListeners.size);
    }

    removeMatchNotificationListener(callback) {
        this.matchNotificationListeners.delete(callback);
        console.log("Removed match notification listener. Count:", this.matchNotificationListeners.size);
    }

    notifyMatchListeners(matchData) {
        console.log(`[SocketService LOG] Notifying ${this.matchNotificationListeners.size} match listeners.`);
        this.matchNotificationListeners.forEach(listener => {
            try {
                console.log("[SocketService LOG] Calling a match listener function.");
                listener(matchData);
            } catch (error) {
                console.error("[SocketService LOG] Error in match notification listener:", error);
            }
        });
    }

    setupMatchNotificationListener() {
        if (!this.socket) {
            console.error("Cannot set up match notification listener: socket not initialized");
            return;
        }

        this.socket.off("match_created");

        this.socket.on("match_created", async (data) => {
            console.log(
                "[SocketService LOG] Match notification received:",
                JSON.stringify(data, null, 2)
            );

            if (!this.currentUserId) {
                await this.getCurrentUser();
            }

            // Notify any listeners (components) that are waiting for match notifications
            this.notifyMatchListeners(data);
            
            // Create a local notification for the match
            this.createMatchNotification(data);
        });

        console.log("[SocketService LOG] Match notification listener setup complete.");
    }

    async createMatchNotification(matchData) {
        try {
            // Check if app is in foreground
            const appState = AppState.currentState;
            
            // The pet object contains information about the pet that liked the current user's pet
            // matchedPet contains information about the current user's pet
            // For notifications, we want to show the name of the pet that liked the user's pet
            const petName = matchData.pet?.name || "Someone";
            const notificationTitle = "You got a match!";
            const notificationBody = `${petName} has matched with your pet!`;
            
            // Create notification content
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: notificationTitle,
                    body: notificationBody,
                    data: { 
                        type: 'match',
                        matchId: matchData.matchId, 
                        chatId: matchData.chatId 
                    },
                    sound: true,
                },
                trigger: null, // Show immediately
            });
            
            console.log("[SocketService LOG] Match notification created");
        } catch (error) {
            console.error("[SocketService LOG] Error creating match notification:", error);
        }
    }

    // Chat removal notification listeners
    addChatRemovalListener(callback) {
        this.chatRemovalListeners.add(callback);
        console.log("Added chat removal listener. Count:", this.chatRemovalListeners.size);
    }

    removeChatRemovalListener(callback) {
        this.chatRemovalListeners.delete(callback);
        console.log("Removed chat removal listener. Count:", this.chatRemovalListeners.size);
    }

    notifyChatRemovalListeners(chatId) {
        console.log(`[SocketService LOG] Notifying ${this.chatRemovalListeners.size} chat removal listeners.`);
        this.chatRemovalListeners.forEach(listener => {
            try {
                console.log("[SocketService LOG] Calling a chat removal listener function.");
                listener(chatId);
            } catch (error) {
                console.error("[SocketService LOG] Error in chat removal listener:", error);
            }
        });
    }

    setupChatRemovalListener() {
        if (!this.socket) {
            console.error("Cannot set up chat removal listener: socket not initialized");
            return;
        }

        this.socket.off("chat_removed");

        this.socket.on("chat_removed", async (data) => {
            console.log(
                "[SocketService LOG] Chat removal notification received:",
                JSON.stringify(data, null, 2)
            );

            if (!data || !data.chatId) {
                console.log("[SocketService LOG] Received invalid chat removal data");
                return;
            }

            // Clean up the unread state for this chat
            try {
                const unreadData = await AsyncStorage.getItem('unreadChats');
                if (unreadData) {
                    const unreadChats = JSON.parse(unreadData);
                    if (unreadChats[data.chatId]) {
                        delete unreadChats[data.chatId];
                        await AsyncStorage.setItem('unreadChats', JSON.stringify(unreadChats));
                        console.log(`[SocketService LOG] Removed chat ${data.chatId} from unread chats state`);
                    }
                }
            } catch (error) {
                console.error("[SocketService LOG] Error updating unread chats:", error);
            }

            // Notify any listeners (components) that are waiting for chat removal notifications
            this.notifyChatRemovalListeners(data.chatId);
        });

        console.log("[SocketService LOG] Chat removal listener setup complete.");
    }
}

export default new SocketService();
