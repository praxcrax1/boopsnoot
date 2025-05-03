import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    AppState,
    StatusBar,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';

// Services
import ChatService from "../services/ChatService";
import SocketService from "../services/SocketService";
import PetService from "../services/PetService";

// Components
import PetSelectorModal from "../components/finder/PetSelectorModal";

// Styles and Context
import theme, { withOpacity } from "../styles/theme";
import { ChatNotificationContext } from "../contexts/ChatNotificationContext";

/**
 * ChatListScreen component displaying all user chats
 * Shows unread chats at the top, followed by recent messages
 * and then latest matches at the top (even without messages)
 */
const ChatListScreen = ({ navigation }) => {
    // ====== STATE MANAGEMENT ======
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadChats, setUnreadChats] = useState({});
    const [userPets, setUserPets] = useState([]);
    const [selectedPetId, setSelectedPetId] = useState(null); // null means "All Pets"
    const [petSelectorVisible, setPetSelectorVisible] = useState(false);
    
    // ====== REFS ======
    const appState = useRef(AppState.currentState);
    const socketInitialized = useRef(false);
    const notificationListener = useRef();
    const responseListener = useRef();
    
    // ====== CONTEXT ======
    const { updateUnreadStatus } = useContext(ChatNotificationContext);

    // ====== HELPER FUNCTIONS ======
    
    /**
     * Sorts chats by priority:
     * 1. Unread chats
     * 2. Chats with recent messages
     * 3. Latest matches without messages
     */
    const sortChats = useCallback((chatList, unreadState) => {
        return [...chatList].sort((a, b) => {
            // Priority 1: Unread chats at the top
            const aUnread = unreadState[a._id] || (a.lastMessage && a.lastMessage.unread);
            const bUnread = unreadState[b._id] || (b.lastMessage && b.lastMessage.unread);
            
            if (aUnread && !bUnread) return -1;
            if (!aUnread && bUnread) return 1;
            
            // Priority 2: Chats with messages, sorted by most recent message
            const aHasMessages = a.lastMessage && a.lastMessage.createdAt;
            const bHasMessages = b.lastMessage && b.lastMessage.createdAt;
            
            if (aHasMessages && bHasMessages) {
                return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
            }
            
            // Priority 3: If one has messages and the other doesn't
            if (aHasMessages && !bHasMessages) return -1;
            if (!aHasMessages && bHasMessages) return 1;
            
            // Priority 4: No messages on either - sort by match date (newest matches first)
            const aMatchDate = a.match && a.match.matchDate ? new Date(a.match.matchDate) : new Date(a.createdAt);
            const bMatchDate = b.match && b.match.matchDate ? new Date(b.match.matchDate) : new Date(b.createdAt);
            
            return bMatchDate - aMatchDate;
        });
    }, []);
    
    /**
     * Formats timestamp relative to current time
     * Today: shows time (12:30 PM)
     * This week: shows day (Mon, Tue)
     * Older: shows date (Jan 12)
     */
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

    // ====== DATA MANAGEMENT ======
    
    /**
     * Load unread state from AsyncStorage
     */
    const loadUnreadState = async () => {
        try {
            const unreadData = await AsyncStorage.getItem('unreadChats');
            return unreadData ? JSON.parse(unreadData) : {};
        } catch (error) {
            console.error("Error loading unread state:", error);
            return {};
        }
    };
    
    /**
     * Save unread state to AsyncStorage and update global context
     */
    const saveUnreadState = async (unreadState) => {
        try {
            await AsyncStorage.setItem('unreadChats', JSON.stringify(unreadState));
            // Update the global unread status
            updateUnreadStatus(Object.keys(unreadState || {}).length > 0);
        } catch (error) {
            console.error("Error saving unread state:", error);
        }
    };
    
    /**
     * Fetch all chats from API and sort them appropriately
     */
    const fetchChats = useCallback(async () => {
        setLoading(true);
        try {
            const response = await ChatService.getChats();
            
            // Load saved unread state which has now been updated by ChatService
            const unreadState = await loadUnreadState();
            setUnreadChats(unreadState || {});
            
            // Process API response to identify unread chats
            const updatedChats = (response.chats || []).map(chat => {
                // If the backend indicates a message is unread, make sure it's marked in our state
                if (chat.lastMessage && chat.lastMessage.unread) {
                    unreadState[chat._id] = true;
                }
                return chat;
            });
            
            // Sort chats before setting state
            const sortedChats = sortChats(updatedChats, unreadState || {});
            setChats(sortedChats);
            
            // Make sure the unread state is saved and global notification status is updated
            saveUnreadState(unreadState);
        } catch (error) {
            console.error("Error fetching chats:", error);
        } finally {
            setLoading(false);
        }
    }, [updateUnreadStatus, sortChats]);

    /**
     * Fetch user pets from API
     */
    const fetchUserPets = useCallback(async () => {
        try {
            const response = await PetService.getUserPets();
            const pets = response.pets || [];
            setUserPets(pets);
            
            // If we have pets and no pet is currently selected, select the first one
            if (pets.length > 0 && !selectedPetId) {
                setSelectedPetId(pets[0]._id);
            }
        } catch (error) {
            console.error("Error fetching user pets:", error);
        }
    }, [selectedPetId]);

    // ====== EVENT HANDLERS ======
    
    /**
     * Handle navigating to a specific chat and mark as read
     */
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
    
    /**
     * Handle new incoming messages from socket
     */
    const handleNewMessage = useCallback((message) => {
        // Log when the handler is called
        console.log(
            "[ChatListScreen LOG] handleNewMessage called with message:",
            JSON.stringify(message, null, 2)
        );

        if (!message || !message.chatId) {
            console.log("[ChatListScreen LOG] Received invalid message data", message);
            return;
        }

        console.log("ChatListScreen: Handling new message for chat:", message.chatId);

        // Check if the user is currently viewing this specific chat
        // 1. First check the navigation state
        const currentRoute = navigation.getState()?.routes.find(route => route.name === 'Chat');
        // 2. Then also check the active chat ID stored in SocketService
        const activeChatId = SocketService.getActiveChatId();
        const isViewingThisChat = 
            (currentRoute?.params?.chatId === message.chatId) || 
            (activeChatId === message.chatId);

        console.log(`[ChatListScreen LOG] Is viewing this chat? ${isViewingThisChat} (activeChatId: ${activeChatId})`);

        // Update unread status only if not viewing the chat
        if (!isViewingThisChat) {
            setUnreadChats(prev => {
                const newState = { ...prev, [message.chatId]: true };
                saveUnreadState(newState);
                console.log("ChatListScreen: Marked chat as unread:", message.chatId);
                return newState;
            });
        } else {
            console.log("ChatListScreen: User is viewing this chat, not marking as unread");
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
                        unread: !isViewingThisChat
                    }
                };
                // Remove from current position and add to the beginning
                updatedChats.splice(chatIndex, 1);
                updatedChats.unshift(updatedChat);
                console.log("ChatListScreen: Updated existing chat:", message.chatId);
            } else {
                // Chat doesn't exist, fetch all chats again to get the new one
                console.log("ChatListScreen: New chat detected, refetching list.");
                fetchChats();
                return prevChats;
            }

            return updatedChats;
        });
    }, [navigation, fetchChats]);

    // ====== SOCKET CONNECTION ======
    
    /**
     * Initialize socket connection and message listeners
     */
    const initializeSocket = useCallback(async () => {
        console.log("[ChatListScreen LOG] Attempting to initialize socket and add listener.");
        
        if (socketInitialized.current) {
            console.log("[ChatListScreen LOG] Socket already initialized.");
            return;
        }

        try {
            await SocketService.connect();
            console.log("[ChatListScreen LOG] Calling SocketService.addGlobalMessageListener.");
            SocketService.addGlobalMessageListener(handleNewMessage);
            socketInitialized.current = true;
            console.log("[ChatListScreen LOG] Socket initialized and global listener added successfully.");
        } catch (error) {
            console.error("[ChatListScreen LOG] Error initializing socket:", error);
        }
    }, [handleNewMessage]);

    // Handle chat removal (when another user unmatches or deletes their pet)
    const handleChatRemoval = useCallback((chatId) => {
        console.log("[ChatListScreen LOG] Chat removal notification received for chat:", chatId);

        // Remove the chat from the chats state
        setChats(prevChats => prevChats.filter(chat => chat._id !== chatId));

        // Remove from unread state
        setUnreadChats(prev => {
            const newState = { ...prev };
            if (newState[chatId]) {
                delete newState[chatId];
                saveUnreadState(newState);
                console.log("[ChatListScreen LOG] Removed unread status for chat:", chatId);
            }
            return newState;
        });
    }, []);

    // ====== EFFECTS AND LIFECYCLE ======
    
    // Listen for new match notifications to refresh the chat list
    useEffect(() => {
        const matchSubscription = SocketService.addMatchNotificationListener(() => {
            console.log("Match notification received, refreshing chats");
            fetchChats();
        });
        
        // Listen for chat removal notifications
        const chatRemovalSubscription = SocketService.addChatRemovalListener(handleChatRemoval);
        
        return () => {
            if (matchSubscription) {
                SocketService.removeMatchNotificationListener(matchSubscription);
            }
            
            if (chatRemovalSubscription) {
                SocketService.removeChatRemovalListener(chatRemovalSubscription);
            }
        };
    }, [fetchChats, handleChatRemoval]);
    
    // Main effect for initializing sockets, handling app state changes, and cleanup
    useEffect(() => {
        // Initial fetch
        fetchChats();
        fetchUserPets();
        
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
            focusSubscription();

            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }

            if (socketInitialized.current) {
                console.log("[ChatListScreen LOG] Removing global message listener.");
                SocketService.removeGlobalMessageListener(handleNewMessage);
                socketInitialized.current = false;
                console.log("[ChatListScreen LOG] Removed global message listener.");
            }
        };
    }, [navigation, fetchChats, initializeSocket, handleNewMessage]);

    // ====== RENDER FUNCTIONS ======
    
    /**
     * Renders a single chat item in the list
     */
    const renderChatItem = ({ item }) => {
        const otherPet = item.participants.find((p) => !p.isCurrentUser);
        const lastMessage = item.lastMessage || {};
        const isUnread = unreadChats[item._id] || lastMessage.unread;
        const petName = otherPet?.pet?.name || "Unknown Pet";
        const petPhoto = otherPet?.pet?.photos?.length > 0 
            ? { uri: otherPet.pet.photos[0] } 
            : require("../assets/default-pet.png");

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => handleChatPress(item._id)}
                activeOpacity={0.7}>
                <Image
                    style={styles.avatar}
                    source={petPhoto}
                />
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={[
                            styles.petName,
                            isUnread && styles.boldText
                        ]}>
                            {petName}
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

    /**
     * Renders the empty state when no chats exist
     */
    const renderEmptyState = () => (
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
    );

    /**
     * Renders the header component with gradient background
     */
    const renderHeader = () => {
        return (
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={styles.gradientHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.headerContainer}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerText}>Messages</Text>
                        <Text style={styles.subHeaderText}>
                            Connect with your pet's playmates
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        );
    };

    /**
     * Renders the pet selector component
     */
    const renderPetSelector = () => {
        // Only render if user has multiple pets
        if (userPets.length <= 1) return null;

        // Get the selected pet object
        const selectedPet = selectedPetId 
            ? userPets.find(pet => pet._id === selectedPetId)
            : null;

        return (
            <View style={styles.petSelectorContainer}>
                <Text style={styles.petSelectorLabel}>
                    Select a pet to filter messages
                </Text>
                <TouchableOpacity
                    style={styles.petSelectorButton}
                    onPress={() => setPetSelectorVisible(true)}
                >
                    <View style={styles.petSelectorContent}>
                        {selectedPet ? (
                            <>
                                <Image
                                    source={
                                        selectedPet.photos && selectedPet.photos.length > 0
                                            ? { uri: selectedPet.photos[0] }
                                            : require("../assets/default-pet.png")
                                    }
                                    style={styles.selectedPetImage}
                                />
                                <Text style={styles.selectedPetName}>
                                    {selectedPet.name}
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.selectedPetName}>All Pets</Text>
                        )}
                        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    // ====== MAIN RENDER ======
    const filteredChats = selectedPetId
        ? chats.filter((chat) =>
            chat.participants.some(
                (participant) => participant.pet?._id === selectedPetId
            )
        )
        : chats;

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent={true}
            />
            
            {renderHeader()}
            {renderPetSelector()}

            {filteredChats.length > 0 ? (
                <FlatList
                    data={filteredChats}
                    renderItem={renderChatItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : renderEmptyState()}

            {/* Pet Selector Modal */}
            <PetSelectorModal
                visible={petSelectorVisible}
                pets={userPets}
                selectedPetId={selectedPetId}
                onClose={() => setPetSelectorVisible(false)}
                onSelectPet={(petId) => {
                    setSelectedPetId(petId); // Toggle off if the same pet is selected
                    setPetSelectorVisible(false);
                }}
            />
        </SafeAreaView>
    );
};

// ====== STYLES ======
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
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 1,
        paddingHorizontal: theme.spacing.xl,
    },
    headerContainer: {
        alignItems: "center",
        marginTop: Platform.OS === 'ios' ? 15 : 5,
    },
    headerTextContainer: {
        alignItems: "center",
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
    petSelectorContainer: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.background,
        marginTop: 10,
    },
    petSelectorLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    petSelectorButton: {
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    petSelectorContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    selectedPetImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    selectedPetName: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textPrimary,
        marginRight: theme.spacing.xs,
    },
    listContainer: {
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
