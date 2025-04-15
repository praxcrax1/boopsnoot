import AsyncStorage from "@react-native-async-storage/async-storage";
import io from "socket.io-client";
import { SOCKET_URL } from "../constants/apiConfig";

class SocketService {
    socket = null;
    currentUserId = null;
    isConnecting = false;

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
        // Prevent multiple connection attempts
        if (this.isConnecting) {
            console.log("Connection already in progress, waiting...");
            let attempts = 0;
            while (!this.socket && attempts < 10) {
                await new Promise((resolve) => setTimeout(resolve, 300));
                attempts++;
            }
            return this.socket;
        }

        // If socket exists and is connected, return it
        if (this.socket && this.socket.connected) {
            console.log("Socket already connected:", this.socket.id);
            return this.socket;
        }

        this.isConnecting = true;
        console.log("Starting socket connection process");

        try {
            await this.getCurrentUser();

            console.log("Connecting to socket at:", SOCKET_URL);

            // Create new socket connection
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

            // Set up connection event handlers
            this.socket.on("connect", () => {
                console.log("Socket connected with ID:", this.socket.id);

                // Authenticate the socket with user ID
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
                    // Try to get user ID if not available
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

                // Auto reconnect if disconnected unexpectedly
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

            // Wait for connection to establish
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

            // Make sure socket is connected before joining chat
            if (!this.socket || !this.socket.connected) {
                console.log("Socket not connected, connecting now...");
                await this.connect();
                // Add a small delay to ensure connection is fully established
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            // Double check the connection
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
            // Ensure socket is connected
            if (!this.socket || !this.socket.connected) {
                console.log(
                    "Socket not connected, connecting before sending message..."
                );
                await this.connect();
                // Add a small delay to ensure connection is fully established
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            if (!this.socket || !this.socket.connected) {
                throw new Error(
                    "Socket not connected after reconnection attempt"
                );
            }

            // Make sure we have the current user ID
            if (!this.currentUserId) {
                await this.getCurrentUser();
            }

            console.log(
                "Emitting message to room:",
                messageData.chatId,
                "with user ID:",
                this.currentUserId
            );

            // Make sure we include the current user ID with the message
            const messageWithSender = {
                ...messageData,
                senderId: this.currentUserId,
            };

            // Use the correct event name that matches the backend
            this.socket.emit("send_message", messageWithSender);
            return true;
        } catch (error) {
            console.error("Error sending message via socket:", error);
            return false;
        }
    }

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
                this.socket.off("receive_message");

                // Use the correct event name that matches the backend
                this.socket.on("receive_message", (data) => {
                    console.log(
                        "Received message:",
                        data,
                        "Current user:",
                        this.currentUserId
                    );

                    // Determine if the sender is the current user
                    const isCurrentUser =
                        data.senderId === this.currentUserId ||
                        data.senderUserId === this.currentUserId ||
                        (data.sender &&
                            (data.sender._id === this.currentUserId ||
                                data.sender.isCurrentUser));

                    // Create a standardized message format to ensure consistency
                    const standardizedMessage = {
                        ...data,
                        sender: {
                            ...data.sender,
                            isCurrentUser: isCurrentUser,
                        },
                    };

                    callback(standardizedMessage);
                });
            } else {
                console.error(
                    "Cannot set up message listener: socket not initialized"
                );
            }
        } catch (error) {
            console.error("Error setting up message listener:", error);
        }
    }

    offReceiveMessage() {
        if (this.socket) {
            this.socket.off("receive_message");
        }
    }
}

export default new SocketService();
