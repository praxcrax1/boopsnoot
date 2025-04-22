import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    AppState,
    StatusBar,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ChatService from "../services/ChatService";
import SocketService from "../services/SocketService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';
import theme, { withOpacity } from "../styles/theme";

const ChatListScreen = ({ navigation }) => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadChats, setUnreadChats] = useState({});
    const appState = useRef(AppState.currentState);
    const socketInitialized = useRef(false);
    const notificationListener = useRef();
    const responseListener = useRef();
    
    // Fetch all chats from API
    const fetchChats = useCallback(async () => {
        setLoading(true);
        try {
            const response = await ChatService.getChats();
            setChats(response.chats || []);
            
            // Load saved unread state
            const unreadState = await loadUnreadState();
            setUnreadChats(unreadState || {});
        } catch (error) {
            console.error("Error fetching chats:", error);
        } finally {
            setLoading(false);
        }
    }, []);
    
    // Load unread state from storage
    const loadUnreadState = async () => {
        try {
            const unreadData = await AsyncStorage.getItem('unreadChats');
            return unreadData ? JSON.parse(unreadData) : {};
        } catch (error) {
            console.error("Error loading unread state:", error);
            return {};
        }
    };
    
    // Save unread state to storage
    const saveUnreadState = async (unreadState) => {
        try {
            await AsyncStorage.setItem('unreadChats', JSON.stringify(unreadState));
        } catch (error) {
            console.error("Error saving unread state:", error);
        }
    };
    
    // Handle new message from socket (now received via global listener)
    const handleNewMessage = useCallback((message) => {
        // --- Log when the handler is called ---
        console.log(
            "[ChatListScreen LOG] handleNewMessage called with message:",
            JSON.stringify(message, null, 2)
        );
        // --- End Log ---

        if (!message || !message.chatId) {
            console.log("[ChatListScreen LOG] Received invalid message data", message);
            return;
        }

        console.log("ChatListScreen: Handling new message for chat:", message.chatId);

        // Check if the user is currently viewing this specific chat
        const currentRoute = navigation.getState()?.routes.find(route => route.name === 'Chat');
        const isViewingThisChat = currentRoute?.params?.chatId === message.chatId;

        // Update unread status only if not viewing the chat
        if (!isViewingThisChat) {
            setUnreadChats(prev => {
                const newState = { ...prev, [message.chatId]: true };
                saveUnreadState(newState);
                console.log("ChatListScreen: Marked chat as unread:", message.chatId);
                return newState;
            });
        }

        // Update chat list state
        setChats(prevChats => {
            const chatIndex = prevChats.findIndex(chat => chat._id === message.chatId);
            let updatedChats = [...prevChats];

            if (chatIndex !== -1) {
                // Chat exists, update its last message and move to top
                const existingChat = updatedChats[chatIndex];
                const updatedChat = {
                    ...existingChat,
                    lastMessage: {
                        content: message.content,
                        createdAt: message.createdAt || new Date().toISOString(),
                        // Mark as unread based on whether user is viewing the chat
                        unread: !isViewingThisChat
                    }
                };
                // Remove from current position and add to the beginning
                updatedChats.splice(chatIndex, 1);
                updatedChats.unshift(updatedChat);
                console.log("ChatListScreen: Updated existing chat:", message.chatId);
            } else {
                // Chat doesn't exist, fetch all chats again to get the new one
                // This might happen if a new match starts chatting immediately
                console.log("ChatListScreen: New chat detected, refetching list.");
                fetchChats(); // Refetch to include the new chat
                // Return previous state for now until fetch completes
                return prevChats;
            }

            return updatedChats;
        });
    }, [navigation, fetchChats]);
    
    // Initialize socket listeners using the global system
    const initializeSocket = useCallback(async () => {
        // --- Log when initialization starts ---
        console.log("[ChatListScreen LOG] Attempting to initialize socket and add listener.");
        // --- End Log ---
        if (socketInitialized.current) {
            console.log("[ChatListScreen LOG] Socket already initialized.");
            return;
        }

        try {
            await SocketService.connect(); // Ensure connection
            // Use the new global listener registration
            console.log("[ChatListScreen LOG] Calling SocketService.addGlobalMessageListener.");
            SocketService.addGlobalMessageListener(handleNewMessage);
            socketInitialized.current = true;
            console.log("[ChatListScreen LOG] Socket initialized and global listener added successfully.");
        } catch (error) {
            console.error("[ChatListScreen LOG] Error initializing socket:", error);
        }
    }, [handleNewMessage]);
    
    // Mark chat as read when entering it
    const handleChatPress = useCallback((chatId) => {
        navigation.navigate("Chat", { chatId });
        
        // Mark as read
        setUnreadChats(prev => {
            const newState = { ...prev };
            delete newState[chatId];
            saveUnreadState(newState);
            return newState;
        });
        
        // Update the local chat state to remove unread indicator
        setChats(prevChats => {
            return prevChats.map(chat => {
                if (chat._id === chatId && chat.lastMessage) {
                    return {
                        ...chat,
                        lastMessage: {
                            ...chat.lastMessage,
                            unread: false
                        }
                    };
                }
                return chat;
            });
        });
    }, [navigation]);
    
    useEffect(() => {
        // Initial fetch
        fetchChats();
        
        // Set up socket listener
        initializeSocket();
        
        // Handle app state changes to reconnect socket when app comes back to foreground
        const appStateSubscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('ChatListScreen: App has come to the foreground!');
                initializeSocket();
                fetchChats();
            }
            
            appState.current = nextAppState;
        });
        
        // Refresh chats when the screen is focused
        const focusSubscription = navigation.addListener("focus", () => {
            console.log("ChatListScreen: Screen focused, fetching chats.");
            fetchChats();
            Notifications.setBadgeCountAsync(0);
        });

        // Notification Interaction Handling
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received while app foregrounded:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification tapped:', response);
            const { chatId } = response.notification.request.content.data;
            if (chatId) {
                console.log('Navigating to chat from notification:', chatId);
                navigation.navigate('Chat', { chatId });
            }
        });

        // Cleanup function
        return () => {
            console.log("[ChatListScreen LOG] Cleaning up listeners.");
            appStateSubscription.remove();
            focusSubscription(); // Remove focus listener

            // Remove notification listeners
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }

            // Use the new global listener removal
            if (socketInitialized.current) {
                console.log("[ChatListScreen LOG] Removing global message listener.");
                SocketService.removeGlobalMessageListener(handleNewMessage);
                socketInitialized.current = false; // Reset flag on cleanup
                console.log("[ChatListScreen LOG] Removed global message listener.");
            }
        };
    }, [navigation, fetchChats, initializeSocket, handleNewMessage]);

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();

        // If the message was sent today, show time only
        if (
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
        ) {
            return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
        }

        // If the message was sent this week, show day of week
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: "short" });
        }

        // Otherwise, show the date
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const renderChatItem = ({ item }) => {
        const otherPet = item.participants.find((p) => !p.isCurrentUser);
        const lastMessage = item.lastMessage || {};
        const isUnread = unreadChats[item._id] || lastMessage.unread;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => handleChatPress(item._id)}
                activeOpacity={0.7}>
                <Image
                    style={styles.avatar}
                    source={
                        otherPet &&
                        otherPet.pet &&
                        otherPet.pet.photos &&
                        otherPet.pet.photos.length > 0
                            ? { uri: otherPet.pet.photos[0] }
                            : require("../assets/default-pet.png")
                    }
                />
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={[
                            styles.petName,
                            isUnread && styles.boldText
                        ]}>
                            {otherPet && otherPet.pet
                                ? otherPet.pet.name
                                : "Unknown Pet"}
                        </Text>
                        <Text style={styles.timestamp}>
                            {lastMessage.createdAt
                                ? formatTimestamp(lastMessage.createdAt)
                                : ""}
                        </Text>
                    </View>
                    <Text
                        style={[
                            styles.messagePreview,
                            isUnread ? styles.unreadMessage : null,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {lastMessage.content || "No messages yet"}
                    </Text>
                </View>
                {isUnread && <View style={styles.unreadIndicator} />}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent={true}
            />
            
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={styles.gradientHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.headerText}>Messages</Text>
                    <Text style={styles.subHeaderText}>
                        Connect with your pet's playmates
                    </Text>
                </View>
            </LinearGradient>

            {chats.length > 0 ? (
                <FlatList
                    data={chats}
                    renderItem={renderChatItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons
                        name="chatbubble-ellipses"
                        size={64}
                        color={withOpacity(theme.colors.textSecondary, 0.3)}
                    />
                    <Text style={styles.emptyTitle}>No Messages Yet</Text>
                    <Text style={styles.emptyDescription}>
                        Match with pets nearby to start chatting with their
                        owners
                    </Text>
                    <TouchableOpacity
                        style={styles.finderButton}
                        onPress={() => navigation.navigate("Finder")}
                        activeOpacity={0.8}>
                        <Text style={styles.finderButtonText}>
                            Find Matches
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background,
    },
    gradientHeader: {
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 20,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: -20,
        zIndex: 10,
        paddingHorizontal: theme.spacing.xl,
    },
    headerContainer: {
        alignItems: "center",
        marginTop: Platform.OS === 'ios' ? 15 : 5,
    },
    headerText: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    subHeaderText: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
    },
    listContainer: {
        paddingTop: 30,
        paddingVertical: theme.spacing.sm,
    },
    chatItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        backgroundColor: theme.colors.surface,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: theme.spacing.lg,
        backgroundColor: theme.colors.backgroundVariant,
        borderWidth: 2,
        borderColor: withOpacity(theme.colors.primary, 0.2),
    },
    chatInfo: {
        flex: 1,
        justifyContent: "center",
    },
    chatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.xs,
    },
    petName: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
    },
    boldText: {
        fontWeight: theme.typography.fontWeight.bold,
    },
    timestamp: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    messagePreview: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
    },
    unreadMessage: {
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textPrimary,
    },
    unreadIndicator: {
        width: 10,
        height: 10,
        borderRadius: theme.borderRadius.circle,
        backgroundColor: theme.colors.primary,
        marginLeft: theme.spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.xxxl,
    },
    emptyTitle: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    emptyDescription: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: "center",
        marginBottom: theme.spacing.xl,
        lineHeight: theme.typography.lineHeight.normal,
    },
    finderButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.small,
    },
    finderButtonText: {
        color: theme.colors.onPrimary,
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.semiBold,
    },
});

export default ChatListScreen;
