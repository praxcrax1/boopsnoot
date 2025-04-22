import AsyncStorage from "@react-native-async-storage/async-storage";
import io from "socket.io-client";
import { SOCKET_URL } from "../constants/apiConfig";

class SocketService {
    socket = null;
    currentUserId = null;
    isConnecting = false;
    globalMessageListeners = new Set();

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
        });

        console.log("[SocketService LOG] Global 'receive_message' listener setup complete.");
    }

    async onReceiveMessage(callback) {
       console.warn("SocketService.onReceiveMessage is potentially deprecated. Use addGlobalMessageListener instead.");
       this.addGlobalMessageListener(callback);
    }

    offReceiveMessage(callback) {
       console.warn("SocketService.offReceiveMessage is potentially deprecated. Use removeGlobalMessageListener instead.");
       this.removeGlobalMessageListener(callback);
    }
}

export default new SocketService();
