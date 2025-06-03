/**
 * @file ChatListScreen.js
 * @description Displays all user chats with filtering and unread message indicators
 * @module screens/ChatListScreen
 */
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
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';
import { LinearGradient } from "expo-linear-gradient";

// Services
import ChatService from "../services/ChatService";
import PetService from "../services/PetService";

// Components
import FilterChip from "../components/chat/FilterChip";

// Styles and Context
import theme, { withOpacity } from "../styles/theme";
import { ChatNotificationContext } from "../contexts/ChatNotificationContext";
import { SocketContext } from "../contexts/SocketContext";

// Custom Hooks
import useSocketListener from "../hooks/useSocketListener";

// Constants
const STORAGE_KEYS = {
    UNREAD_CHATS: 'unreadChats',
};

/**
 * ChatListScreen component
 * 
 * Displays all user chats with:
 * - Unread chats at the top
 * - Recent messages in the middle
 * - Latest matches at the end (even without messages)
 * 
 * @param {Object} props - Component props
 * @param {Object} props.navigation - React Navigation prop
 */
const ChatListScreen = ({ navigation }) => {
    // =====================================================================
    // STATE MANAGEMENT
    // =====================================================================
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadChats, setUnreadChats] = useState({});
    const [userPets, setUserPets] = useState([]);
    const [selectedPetId, setSelectedPetId] = useState(null); // null means "All Pets"    // =====================================================================
    // REFS & CONTEXT
    // =====================================================================
    const appState = useRef(AppState.currentState);
    const notificationListener = useRef();
    const responseListener = useRef();
    const activeScreenRef = useRef('ChatList');
    const { updateUnreadStatus } = useContext(ChatNotificationContext);
    const { emit, isConnected } = useContext(SocketContext);

    // =====================================================================
    // HELPER FUNCTIONS
    // =====================================================================
    
    /**
     * Sorts chats by priority
     * 
     * @param {Array} chatList - List of chats to sort
     * @param {Object} unreadState - Object tracking unread status by chatId
     * @returns {Array} Sorted array of chats
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
            
            // Priority 4: No messages - sort by match date (newest matches first)
            const aMatchDate = a.match?.matchDate ? new Date(a.match.matchDate) : new Date(a.createdAt);
            const bMatchDate = b.match?.matchDate ? new Date(b.match.matchDate) : new Date(b.createdAt);
            
            return bMatchDate - aMatchDate;
        });
    }, []);
    
    /**
     * Formats timestamp relative to current time
     * 
     * @param {string|Date} timestamp - Timestamp to format
     * @returns {string} Formatted timestamp
     */
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();

        // Today: show time only (12:30 PM)
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

        // This week: show day of week (Mon, Tue)
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: "short" });
        }

        // Older: show date (Jan 12)
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    // =====================================================================
    // DATA MANAGEMENT
    // =====================================================================
    
    /**
     * Load unread state from AsyncStorage
     * 
     * @returns {Object} Unread chats state object
     */
    const loadUnreadState = async () => {
        try {
            const unreadData = await AsyncStorage.getItem(STORAGE_KEYS.UNREAD_CHATS);
            return unreadData ? JSON.parse(unreadData) : {};
        } catch (error) {
            console.error("Error loading unread state:", error);
            return {};
        }
    };
    
    /**
     * Save unread state to AsyncStorage and update global context
     * 
     * @param {Object} unreadState - Unread chats state object
     */
    const saveUnreadState = async (unreadState) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.UNREAD_CHATS, JSON.stringify(unreadState));
            // Update the global unread status
            updateUnreadStatus(Object.keys(unreadState || {}).length > 0);
        } catch (error) {
            console.error("Error saving unread state:", error);
        }
    };
    
    /**
     * Fetch all chats from API
     */
    const fetchChats = useCallback(async () => {
        setLoading(true);
        try {
            const response = await ChatService.getChats();
            
            // Load saved unread state
            const unreadState = await loadUnreadState();
            setUnreadChats(unreadState || {});
            
            // Process API response
            const updatedChats = (response.chats || []).map(chat => {
                if (chat.lastMessage && chat.lastMessage.unread) {
                    unreadState[chat._id] = true;
                }
                return chat;
            });
            
            // Sort and set chats state
            const sortedChats = sortChats(updatedChats, unreadState || {});
            setChats(sortedChats);
            
            // Update notification status
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
            
            // Auto-select first pet if none selected
            if (pets.length > 0 && !selectedPetId) {
                setSelectedPetId(pets[0]._id);
            }
        } catch (error) {
            console.error("Error fetching user pets:", error);
        }
    }, [selectedPetId]);

    // =====================================================================
    // EVENT HANDLERS
    // =====================================================================
    
    /**
     * Handle navigation to chat and mark as read
     * 
     * @param {string} chatId - ID of chat to open
     */
    const handleChatPress = useCallback((chatId) => {
        navigation.navigate("Chat", { chatId });
        
        // Mark as read in state
        setUnreadChats(prev => {
            const newState = { ...prev };
            delete newState[chatId];
            saveUnreadState(newState);
            return newState;
        });
        
        // Update UI to remove unread indicator
        setChats(prevChats => 
            prevChats.map(chat => 
                chat._id === chatId && chat.lastMessage
                    ? {
                        ...chat,
                        lastMessage: {
                            ...chat.lastMessage,
                            unread: false
                        }
                    }
                    : chat
            )
        );
    }, [navigation]);

    // =====================================================================
    // EFFECTS AND LIFECYCLE
    // =====================================================================
      useEffect(() => {
        // Initial data loading
        fetchChats();
        fetchUserPets();
        
        // App state change handling
        const appStateSubscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('ChatListScreen: App has come to the foreground!');
                fetchChats();
            }
            appState.current = nextAppState;
        });
        
        // Screen focus handling
        const focusSubscription = navigation.addListener("focus", () => {
            fetchChats();
            Notifications.setBadgeCountAsync(0);
        });

        // Notification handling
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received while app foregrounded:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const { chatId } = response.notification.request.content.data;
            if (chatId) {
                navigation.navigate('Chat', { chatId });
            }
        });

        // Cleanup
        return () => {
            appStateSubscription.remove();
            focusSubscription();
            
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [navigation, fetchChats, fetchUserPets]);

    // =====================================================================
    // SOCKET HANDLERS FOR REAL-TIME UPDATES
    // =====================================================================
    
    /**
     * Handle new message received via socket.io
     * Updates the chat list to reflect new messages
     */
    const handleNewMessage = useCallback((messageData) => {
        console.log('Socket: New message received', messageData);
        
        // Only process if we're not in the specific chat screen
        // activeScreenRef helps determine if we're in the ChatList view
        if (activeScreenRef.current !== 'ChatList') {
            return;
        }

        const chatId = messageData.chatId;
        
        setChats(prevChats => {
            // Find the chat to update
            const chatIndex = prevChats.findIndex(chat => chat._id === chatId);
            
            if (chatIndex === -1) {
                // Chat not found, it could be a new chat
                // Fetch all chats to get the updated list
                fetchChats();
                return prevChats;
            }
            
            // Create a new array with the updated chat
            const updatedChats = [...prevChats];
            const chat = updatedChats[chatIndex];
            
            // Update the lastMessage and unread status
            updatedChats[chatIndex] = {
                ...chat,
                lastMessage: {
                    ...messageData,
                    unread: true
                }
            };
            
            // Mark as unread locally
            setUnreadChats(prev => {
                const newState = { ...prev, [chatId]: true };
                saveUnreadState(newState);
                return newState;
            });
            
            // Return sorted chats
            return sortChats(updatedChats, unreadChats);
        });
    }, [fetchChats, sortChats, unreadChats]);

    /**
     * Handle chat removed notification
     * Remove the chat from the list
     */
    const handleChatRemoved = useCallback((data) => {
        console.log('Socket: Chat removed notification received', data);
        if (!data || !data.chatId) return;

        setChats(prevChats => 
            prevChats.filter(chat => chat._id !== data.chatId)
        );
        
        // Also remove from unread chats if present
        setUnreadChats(prev => {
            if (prev[data.chatId]) {
                const newState = { ...prev };
                delete newState[data.chatId];
                saveUnreadState(newState);
                return newState;
            }
            return prev;
        });
    }, []);

    /**
     * Handle new match notification
     * Adds the new match to the chat list
     */
    const handleMatchCreated = useCallback((matchData) => {
        console.log('Socket: New match notification received', matchData);
        
        // Fetch all chats to refresh the list with the new match
        fetchChats();
    }, [fetchChats]);

    // Register socket event listeners using our custom hook
    useSocketListener('receive_message', handleNewMessage);
    useSocketListener('chat_removed', handleChatRemoved);
    useSocketListener('match_created', handleMatchCreated);

    // Track active screen for message handling
    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => {
            console.log('ChatListScreen focused');
            activeScreenRef.current = 'ChatList';
        });
        
        const unsubscribeBlur = navigation.addListener('blur', () => {
            console.log('ChatListScreen blurred');
            activeScreenRef.current = 'Other';
        });
        
        return () => {
            unsubscribeFocus();
            unsubscribeBlur();
        };
    }, [navigation]);

    // =====================================================================
    // RENDER HELPER FUNCTIONS
    // =====================================================================
    
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
     * Renders empty state when no chats exist
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
                Match with pets nearby to start chatting with their owners
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
     * Renders header with gradient
     */
    const renderHeader = () => (
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

    /**
     * Renders pet selector using FilterChips
     */
    const renderPetSelector = () => {
        // Only render if user has multiple pets
        if (userPets.length <= 1) return null;

        return (
            <View style={styles.petSelectorContainer}>
                <Text style={styles.petSelectorLabel}>
                    Filter messages by pet
                </Text>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterChipsContainer}
                >                    
                    {userPets.map((pet) => (
                        <FilterChip
                            key={pet._id}
                            pet={pet}
                            isSelected={selectedPetId === pet._id}
                            onSelect={(petId) => setSelectedPetId(petId)}
                        />
                    ))}
                </ScrollView>
            </View>
        );
    };

    // =====================================================================
    // MAIN RENDER
    // =====================================================================
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
        </SafeAreaView>
    );
};

// =====================================================================
// STYLES
// =====================================================================
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
        alignItems: "flex-start",
        marginTop: Platform.OS === 'ios' ? 15 : 5,
    },
    headerTextContainer: {
        alignItems: "flex-start",
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
    filterChipsContainer: {
        paddingVertical: theme.spacing.sm,
        paddingBottom: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
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
