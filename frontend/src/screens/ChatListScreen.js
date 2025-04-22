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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ChatService from "../services/ChatService";
import SocketService from "../services/SocketService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import theme, { withOpacity } from "../styles/theme";

const ChatListScreen = ({ navigation }) => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadChats, setUnreadChats] = useState({});
    const appState = useRef(AppState.currentState);
    const socketInitialized = useRef(false);
    
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
    
    // Handle new message from socket
    const handleNewMessage = useCallback((message) => {
        if (!message || !message.chatId) return;
        
        // Get the active screen to check if user is in the chat
        // Don't mark as unread if user is currently viewing the chat
        const currentRoute = navigation.getCurrentRoute();
        const isInChatScreen = currentRoute?.name === 'Chat' && 
                               currentRoute?.params?.chatId === message.chatId;
        
        if (isInChatScreen) return;
        
        // Add to unread messages
        setUnreadChats(prev => {
            const newState = { 
                ...prev, 
                [message.chatId]: true 
            };
            saveUnreadState(newState);
            return newState;
        });
        
        // Update chat list to show the new message
        setChats(prevChats => {
            // Find the chat that received the message
            const chatIndex = prevChats.findIndex(chat => chat._id === message.chatId);
            if (chatIndex === -1) {
                // If chat doesn't exist in the list (rare case), fetch all chats again
                fetchChats();
                return prevChats;
            }
            
            const updatedChats = [...prevChats];
            
            // Update the chat with new last message
            updatedChats[chatIndex] = {
                ...updatedChats[chatIndex],
                lastMessage: {
                    content: message.content,
                    createdAt: message.createdAt || new Date().toISOString(),
                    unread: true
                }
            };
            
            // Move the updated chat to the top
            const updatedChat = updatedChats.splice(chatIndex, 1)[0];
            updatedChats.unshift(updatedChat);
            
            return updatedChats;
        });
    }, [navigation, fetchChats]);
    
    // Initialize socket listeners
    const initializeSocket = useCallback(async () => {
        if (socketInitialized.current) return;
        
        try {
            await SocketService.connect();
            SocketService.addGlobalMessageListener(handleNewMessage);
            socketInitialized.current = true;
            console.log("Socket initialized for ChatListScreen");
        } catch (error) {
            console.error("Error initializing socket in ChatListScreen:", error);
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
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('App has come to the foreground!');
                initializeSocket();
                fetchChats();
            }
            
            appState.current = nextAppState;
        });
        
        // Refresh chats when the screen is focused
        const unsubscribeFocus = navigation.addListener("focus", () => {
            fetchChats();
        });

        return () => {
            // Clean up on unmount
            subscription.remove();
            unsubscribeFocus();
            if (socketInitialized.current) {
                SocketService.removeGlobalMessageListener(handleNewMessage);
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

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
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    headerTitle: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.textPrimary,
    },
    listContainer: {
        paddingVertical: theme.spacing.sm,
    },
    chatItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: theme.spacing.lg,
        backgroundColor: theme.colors.backgroundVariant,
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
