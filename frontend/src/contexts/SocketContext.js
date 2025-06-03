/**
 * Socket Context - Provides socket connection and methods to the app
 * Manages socket lifecycle and isolates socket functionality
 */
import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import { AuthContext } from "./AuthContext";
import socketService from "../services/SocketService";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { navigationRef } from "../../App";

// Create the context
export const SocketContext = createContext(null);

/**
 * Socket Provider Component
 * Manages socket connection lifecycle and provides socket methods to children
 */
export const SocketProvider = ({ children }) => {
    // Track connection state
    const [isConnected, setIsConnected] = useState(false);
    // Track currently active chat (if any)
    const [activeChatId, setActiveChatId] = useState(null);

    // Get authenticated user from AuthContext
    const { user, isAuthenticated } = useContext(AuthContext);

    // Get unread messages functions
    const { checkAndUpdateUnreadMessages } = useUnreadMessages();
    /**
     * Show a push notification if conditions are met
     * @param {Object} options - Notification options
     */
    const scheduleLocalNotification = useCallback(async (options) => {
        try {
            console.log(
                "SocketProvider: Attempting to schedule notification",
                options.type
            );

            // Request permissions if not already granted
            let { status } = await Notifications.getPermissionsAsync();

            if (status !== "granted") {
                console.log(
                    "SocketProvider: Requesting notification permission"
                );
                const { status: newStatus } =
                    await Notifications.requestPermissionsAsync();
                status = newStatus;
            }

            if (status !== "granted") {
                console.log(
                    "SocketProvider: Notifications permission not granted"
                );
                return;
            }

            // Check if app is in foreground and on relevant screen
            const appState = AppState.currentState;
            const currentRoute = navigationRef.current?.getCurrentRoute?.();
            const isActiveApp = appState === "active";

            console.log(
                `SocketProvider: App state: ${appState}, Route: ${currentRoute?.name}`
            );

            // For chat messages, don't show notifications if in the specific chat
            if (
                options.type === "chat" &&
                isActiveApp &&
                currentRoute?.name === "Chat" &&
                currentRoute.params?.chatId === options.chatId
            ) {
                console.log(
                    "SocketProvider: User is already in this chat, skipping notification"
                );
                return;
            }

            // For match notifications, always show regardless of screen
            // (this is the key difference from chat notifications)

            // Ensure notification has a unique identifier
            const identifier = `${options.type}-${Date.now()}`;

            // Schedule the notification with enhanced settings
            const notificationId =
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: options.title,
                        body: options.body,
                        sound: true,
                        priority:
                            Notifications.AndroidNotificationPriority.HIGH,
                        vibrate: [0, 250, 250, 250],
                        data: {
                            ...options.data,
                            id: identifier,
                        },
                    },
                    trigger: null, // null means show immediately
                });

            console.log(
                `SocketProvider: Notification scheduled with ID: ${notificationId}`
            );

            // Set badge count
            if (Platform.OS === "ios") {
                const currentBadgeCount =
                    await Notifications.getBadgeCountAsync();
                await Notifications.setBadgeCountAsync(currentBadgeCount + 1);
            }

            return notificationId;
        } catch (error) {
            console.error(
                "SocketProvider: Error scheduling notification:",
                error
            );
            return null;
        }
    }, []);

    /**
     * Update unread messages when a new message is received and show notification
     * @param {Object} message - The received message
     */
    const handleNewMessage = useCallback(
        async (message) => {
            if (!message || !message.chatId || !user) return;

            try {
                // Don't mark messages as unread if the user is currently viewing that chat
                if (activeChatId === message.chatId) {
                    return;
                }

                // Don't mark own messages as unread
                if (
                    message.senderId === user._id ||
                    message.senderUserId === user._id ||
                    (message.sender && message.sender._id === user._id)
                ) {
                    return;
                }

                // Update unread messages in AsyncStorage
                const unreadDataJson = await AsyncStorage.getItem(
                    "unreadChats"
                );
                let unreadChats = unreadDataJson
                    ? JSON.parse(unreadDataJson)
                    : {};

                // Update or add the chat to the unread list
                unreadChats[message.chatId] = {
                    lastMessage: message.text || "New message",
                    timestamp: new Date().toISOString(),
                    count: (unreadChats[message.chatId]?.count || 0) + 1,
                };

                // Save updated unread messages
                await AsyncStorage.setItem(
                    "unreadChats",
                    JSON.stringify(unreadChats)
                );
                await AsyncStorage.setItem(
                    "hasUnreadChats",
                    JSON.stringify(true)
                );

                console.log(
                    "SocketProvider: Updated unread messages for chat",
                    message.chatId
                );

                // Schedule notification for the new message
                const senderName =
                    message.senderName || message.sender?.name || "Someone";
                await scheduleLocalNotification({
                    type: "chat",
                    title: `${senderName} sent you a message`,
                    body: message.text || "New message",
                    chatId: message.chatId,
                    data: {
                        type: "chat",
                        chatId: message.chatId,
                        senderId:
                            message.senderId ||
                            message.senderUserId ||
                            (message.sender && message.sender._id),
                    },
                });
            } catch (error) {
                console.error(
                    "SocketProvider: Error updating unread messages:",
                    error
                );
            }
        },
        [user, activeChatId, scheduleLocalNotification]
    );
    /**
     * Handle new match notifications
     * @param {Object} matchData - Data for the new match
     */
    const handleNewMatch = useCallback(
        async (matchData) => {
            if (!matchData || !user) {
                console.log(
                    "SocketProvider: Skipping match notification - invalid data or no user",
                    matchData
                );
                return;
            }

            console.log(
                "SocketProvider: New match received",
                JSON.stringify(matchData)
            );

            try {
                // Get match data
                const matchId = matchData._id || matchData.matchId;
                const chatId = matchData.chatId;

                if (!matchId || !chatId) {
                    console.error(
                        "SocketProvider: Invalid match data - missing ID or chatId",
                        matchData
                    );
                    return;
                }

                // Extract pet names - be more fault tolerant
                let petName = "Someone new";
                if (matchData.matchedPet?.name) {
                    petName = matchData.matchedPet.name;
                } else if (matchData.pet?.name) {
                    petName = matchData.pet.name;
                }

                console.log(
                    `SocketProvider: Showing notification for match with ${petName}`
                );

                // Schedule notification for the new match - with extra logging
                await scheduleLocalNotification({
                    type: "match",
                    title: "🎉 New Match!",
                    body: `${petName} liked you back!`,
                    data: {
                        type: "match",
                        matchId,
                        chatId,
                        timestamp: new Date().toISOString(),
                    },
                });

                console.log(
                    "SocketProvider: Match notification scheduled, updating unread messages"
                );

                // Call the service to update chats after a new match is created
                await checkAndUpdateUnreadMessages();
            } catch (error) {
                console.error(
                    "SocketProvider: Error handling new match:",
                    error
                );
            }
        },
        [user, scheduleLocalNotification, checkAndUpdateUnreadMessages]
    );
    useEffect(() => {
        let socketCleanup;

        if (isAuthenticated && user?._id) {
            console.log(
                `SocketProvider: User authenticated ${user._id}, connecting socket`
            );

            // First, clean up any existing listeners to prevent duplicates
            socketService.off("receive_message");
            socketService.off("match_created");
            socketService.off("chat_removed");
            socketService.off("connect");
            socketService.off("disconnect");

            // Connect to socket server
            socketService
                .connect(user._id)
                .then((socket) => {
                    setIsConnected(true);
                    console.log(
                        `SocketProvider: Socket connected successfully with ID: ${socket.id}`
                    );

                    // After successful connection, verify the socket is registered on the server
                    socket.emit("authenticate", { userId: user._id });
                })
                .catch((error) => {
                    console.error(
                        "SocketProvider: Socket connection error:",
                        error
                    );
                    setIsConnected(false);
                });

            // Setup connection status listener
            const handleConnect = () => {
                console.log("SocketProvider: Socket connected event received");
                setIsConnected(true);

                // Re-authenticate on reconnection
                socketService.emit("authenticate", { userId: user._id });
            };

            const handleDisconnect = () => {
                console.log(
                    "SocketProvider: Socket disconnected event received"
                );
                setIsConnected(false);
            };

            // Setup message listener at the top level
            socketService.on("receive_message", handleNewMessage);

            // Setup match listener for new matches
            socketService.on("match_created", handleNewMatch);

            // Setup chat removal listener
            socketService.on("chat_removed", (data) => {
                console.log("SocketProvider: Chat removed:", data);
            });

            socketService.on("connect", handleConnect);
            socketService.on("disconnect", handleDisconnect);

            // Cleanup function
            socketCleanup = () => {
                socketService.off("receive_message", handleNewMessage);
                socketService.off("match_created", handleNewMatch);
                socketService.off("chat_removed", () => {});
                socketService.off("connect", handleConnect);
                socketService.off("disconnect", handleDisconnect);
            };
        } else if (!isAuthenticated || !user) {
            // Disconnect socket when user logs out
            console.log(
                "SocketProvider: User not authenticated, disconnecting socket"
            );
            socketService.disconnect();
            setIsConnected(false);
        }

        // Cleanup socket listeners on unmount or auth change
        return () => {
            if (socketCleanup) socketCleanup();
        };
    }, [isAuthenticated, user, handleNewMessage, handleNewMatch]);

    // Expose emit method
    const emit = useCallback(
        (event, payload) => {
            if (!isConnected) {
                console.warn(
                    "SocketProvider: Cannot emit, socket not connected"
                );
                return;
            }
            socketService.emit(event, payload);
        },
        [isConnected]
    );

    // Expose on method (for adding listeners)
    const on = useCallback((event, callback) => {
        socketService.on(event, callback);
    }, []);

    // Expose off method (for removing listeners)
    const off = useCallback((event, callback) => {
        socketService.off(event, callback);
    }, []);
    /**
     * Set the active chat ID to prevent marking messages as unread
     * when user is actively viewing a chat
     * @param {string|null} chatId - The active chat ID or null
     */
    const setActiveChat = useCallback((chatId) => {
        console.log("SocketProvider: Setting active chat ID to", chatId);
        setActiveChatId(chatId);
    }, []);

    // Context value
    const contextValue = {
        isConnected,
        userId: user?._id,
        emit,
        on,
        off,
        activeChatId,
        setActiveChat,
    };

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
