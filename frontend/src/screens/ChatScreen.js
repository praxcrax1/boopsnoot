/**
 * @file ChatScreen.js
 * @description Individual chat conversation screen with message list and input
 * @module screens/ChatScreen
 */
import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    StatusBar,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Services
import ChatService from "../services/ChatService";
import MatchService from "../services/MatchService";

// Components and Styles
import MenuBottomSheet from "../components/MenuBottomSheet";
import theme, { withOpacity } from "../styles/theme";

// Context
import { ChatNotificationContext } from "../contexts/ChatNotificationContext";
import { SocketContext } from "../contexts/SocketContext";

// Custom Hooks
import useSocketListener from "../hooks/useSocketListener";

// Constants
const STORAGE_KEYS = {
    USER: "user",
    UNREAD_CHATS: "unreadChats",
    HAS_UNREAD_CHATS: "hasUnreadChats",
};

const MESSAGE_TYPES = {
    DATE_SEPARATOR: "dateSeparator",
    MESSAGE: "message",
};

/**
 * ChatScreen component
 *
 * Displays an individual chat conversation with:
 * - Messages with timestamps and statuses
 * - Date separators for message groups
 * - Input area for sending new messages
 * - Chat options for profile viewing and unmatching
 *
 * @param {Object} props - Component props
 * @param {Object} props.route - React Navigation route prop containing params
 * @param {Object} props.navigation - React Navigation prop
 */
const ChatScreen = ({ route, navigation }) => {
    // =====================================================================
    // STATE MANAGEMENT
    // =====================================================================
    const { chatId } = route.params;
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [chatInfo, setChatInfo] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [otherPet, setOtherPet] = useState(null);
    const [currentPet, setCurrentPet] = useState(null);    // =====================================================================
    // REFS & CONTEXT
    // =====================================================================
    const flatListRef = useRef();
    const { checkUnreadStatus } = useContext(ChatNotificationContext);
    const { emit, isConnected } = useContext(SocketContext);

    // =====================================================================
    // HELPER FUNCTIONS
    // =====================================================================

    /**
     * Scroll to the bottom of the message list
     *
     * @param {boolean} animated - Whether to animate the scroll
     */
    const scrollToBottom = (animated = true) => {
        if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated });
        }
    };

    /**
     * Format date for message separators
     *
     * @param {string} dateString - ISO date string to format
     * @returns {string} Formatted date string (Today, Yesterday, or full date)
     */
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Check if date is today
        if (date.toDateString() === today.toDateString()) {
            return "Today";
        }

        // Check if date is yesterday
        if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        }

        // Otherwise return formatted date
        return date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
    };

    /**
     * Check if a date separator should be displayed between messages
     *
     * @param {Object} currentMsg - Current message object
     * @param {Object} prevMsg - Previous message object
     * @returns {boolean} True if date separator should be shown
     */
    const shouldShowDateSeparator = (currentMsg, prevMsg) => {
        if (!prevMsg) return true; // Always show for first message

        const currentDate = new Date(currentMsg.createdAt).toDateString();
        const prevDate = new Date(prevMsg.createdAt).toDateString();

        return currentDate !== prevDate;
    };

    /**
     * Prepare message data with date separators inserted
     *
     * @returns {Array} Messages with date separators
     */
    const prepareMessagesWithDateSeparators = () => {
        const result = [];

        messages.forEach((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;

            // Add date separator if needed
            if (shouldShowDateSeparator(message, prevMessage)) {
                result.push({
                    _id: `date-${message.createdAt}`,
                    type: MESSAGE_TYPES.DATE_SEPARATOR,
                    date: formatDate(message.createdAt),
                });
            }

            // Add the actual message
            result.push({
                ...message,
                type: MESSAGE_TYPES.MESSAGE,
            });
        });

        return result;
    };

    // =====================================================================
    // DATA MANAGEMENT
    // =====================================================================

    /**
     * Load user ID from AsyncStorage
     *
     * @returns {string|null} User ID if found
     */
    const getUserId = async () => {
        try {
            const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
            if (userData) {
                const user = JSON.parse(userData);
                const userId = user.id || user._id;
                setCurrentUserId(userId);
                return userId;
            }
        } catch (error) {
            console.error("Error getting user data:", error);
        }
        return null;
    };

    /**
     * Mark chat as read in storage and update notification status
     */
    const markChatAsRead = async () => {
        try {
            // Mark as read in local storage
            const unreadData = await AsyncStorage.getItem(STORAGE_KEYS.UNREAD_CHATS);
            if (unreadData) {
                const unreadChats = JSON.parse(unreadData);
                if (unreadChats[chatId]) {
                    delete unreadChats[chatId];
                    await AsyncStorage.setItem(
                        STORAGE_KEYS.UNREAD_CHATS,
                        JSON.stringify(unreadChats)
                    );

                    // Update global notification status if needed
                    if (Object.keys(unreadChats).length === 0) {
                        await AsyncStorage.setItem(
                            STORAGE_KEYS.HAS_UNREAD_CHATS,
                            JSON.stringify(false)
                        );
                    }

                    // Update the notification badge status
                    checkUnreadStatus();
                }
            }
        } catch (error) {
            console.error("Error marking chat as read:", error);
        }
    };

    /**
     * Load chat data from API
     */
    const loadChatData = async () => {
        try {
            const chatResponse = await ChatService.getChatById(chatId);
            setChatInfo(chatResponse.chat);

            if (chatResponse.chat && chatResponse.chat.participants) {
                const foundCurrentPet = chatResponse.chat.participants.find(
                    (p) => p.isCurrentUser
                );
                const foundOtherPet = chatResponse.chat.participants.find(
                    (p) => !p.isCurrentUser
                );

                if (foundCurrentPet && foundCurrentPet.pet) {
                    setCurrentPet(foundCurrentPet.pet);
                }

                if (foundOtherPet && foundOtherPet.pet) {
                    setOtherPet(foundOtherPet.pet);
                    setupNavigationHeader(foundOtherPet.pet);
                }
            }

            setMessages(chatResponse.messages || []);

            // Mark chat as read when opened
            markChatAsRead();

            // Scroll to bottom after loading messages
            setTimeout(() => {
                scrollToBottom(false);
            }, 300);
        } catch (error) {
            console.error("Error loading chat data:", error);
            Alert.alert("Error", "Failed to load chat. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // =====================================================================
    // EVENT HANDLERS
    // =====================================================================

    /**
     * Setup navigation header with pet info and action buttons
     *
     * @param {Object} pet - Pet object for header display
     */
    const setupNavigationHeader = (pet) => {
        navigation.setOptions({
            headerTitle: () => (
                <TouchableOpacity
                    onPress={() => {
                        navigation.navigate("PetProfile", {
                            petId: pet._id,
                        });
                    }}
                >
                    <View style={styles.headerTitleContainer}>
                        <Image
                            source={
                                pet.photos && pet.photos.length > 0
                                    ? { uri: pet.photos[0] }
                                    : require("../assets/default-pet.png")
                            }
                            style={styles.headerAvatar}
                        />
                        <Text style={styles.headerTitle}>{pet.name}</Text>
                    </View>
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => setMenuVisible(true)}
                >
                    <Ionicons
                        name="ellipsis-horizontal"
                        size={24}
                        color={theme.colors.textPrimary}
                    />
                </TouchableOpacity>
            ),
        });
    };

    /**
     * Handle unmatch action with confirmation dialog
     */
    const handleUnmatch = () => {
        if (!currentPet || !otherPet) {
            Alert.alert("Error", "Unable to unmatch. Missing pet information.");
            return;
        }

        Alert.alert(
            "Unmatch",
            `Are you sure you want to unmatch ${otherPet.name}? This action cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Unmatch",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await MatchService.unmatchPet(
                                currentPet._id,
                                otherPet._id
                            );

                            // Navigate back to chat list
                            setMenuVisible(false);
                            navigation.goBack();
                            Alert.alert(
                                "Success",
                                `You've unmatched with ${otherPet.name}.`
                            );
                        } catch (error) {
                            console.error("Error unmatching:", error);
                            Alert.alert(
                                "Error",
                                "Failed to unmatch. Please try again."
                            );
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    /**
     * Send a new message
     */
    const sendMessage = async () => {
        if (!inputText.trim() || isSending) return;

        try {
            const trimmedMessage = inputText.trim();
            setInputText("");
            setIsSending(true);

            // Create temporary message to show immediately
            const tempMessage = {
                _id: `temp-${Date.now()}`,
                content: trimmedMessage,
                sender: { isCurrentUser: true },
                createdAt: new Date().toISOString(),
                pending: true,
            };

            setMessages((prevMessages) => [...prevMessages, tempMessage]);

            // Scroll to bottom immediately after adding the message
            setTimeout(() => scrollToBottom(), 50);

            // Send to server
            const response = await ChatService.sendMessage(
                chatId,
                trimmedMessage
            );

            if (!response || !response.success) {
                throw new Error("Failed to send message");
            }            // Replace temp message with confirmed message
            const confirmedMessage = {
                ...response.message,
                sender: {
                    ...response.message.sender,
                    isCurrentUser: true,
                },
                pending: false,
            };

            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg._id === tempMessage._id ? confirmedMessage : msg
                )
            );

            // Also emit the message over the socket for real-time delivery
            // This ensures other devices of the same user get the message too
            if (isConnected) {
                emit('send_message', {
                    ...confirmedMessage,
                    chatId,
                    senderId: currentUserId,
                });
            }

            // Ensure we scroll to bottom after sending is complete
            setTimeout(() => scrollToBottom(), 200);
        } catch (error) {
            console.error("Error sending message:", error);

            // Mark message as failed
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.pending ? { ...msg, failed: true } : msg
                )
            );

            Alert.alert(
                "Message Failed",
                "Unable to send your message. Please check your connection and try again."
            );
        } finally {
            setIsSending(false);
        }
    };    // =====================================================================
    // SOCKET MESSAGE HANDLER
    // =====================================================================

    /**
     * Handle incoming messages from socket
     * 
     * @param {Object} messageData - Message data from socket
     */
    const handleSocketMessage = useCallback((messageData) => {
        // Skip if this message is from the current user or already exists
        if (
            (messageData.senderUserId && messageData.senderUserId === currentUserId) ||
            messages.some(msg => msg._id === messageData._id)
        ) {
            return;
        }

        console.log('Received message via socket:', messageData);
        
        // Format the incoming message in the expected format
        const formattedMessage = {
            _id: messageData._id,
            content: messageData.content,
            createdAt: messageData.createdAt || new Date().toISOString(),
            sender: {
                isCurrentUser: false,
                ...messageData.sender
            },
            read: false,
        };

        // Add message to the list
        setMessages(prevMessages => [...prevMessages, formattedMessage]);
        
        // Scroll to bottom when a new message is received
        setTimeout(() => scrollToBottom(), 100);
    }, [messages, currentUserId]);

    // Listen for incoming messages
    useSocketListener('receive_message', handleSocketMessage, [handleSocketMessage]);

    // =====================================================================
    // EFFECTS AND LIFECYCLE
    // =====================================================================

    // Join chat room when component mounts and socket is connected
    useEffect(() => {
        if (isConnected && chatId) {
            console.log(`Joining chat room: ${chatId}`);
            emit('join_chat', chatId);
        }
    }, [isConnected, chatId, emit]);

    useEffect(() => {
        // Setup back button in header
        navigation.setOptions({
            headerShown: true,
            headerLeft: () => (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={theme.colors.textPrimary}
                    />
                </TouchableOpacity>
            ),
        });

        // Initialize chat data
        const initializeChat = async () => {
            await getUserId();
            await loadChatData();
        };

        initializeChat();
    }, [chatId, navigation, checkUnreadStatus]);

    // =====================================================================
    // RENDER HELPER FUNCTIONS
    // =====================================================================

    /**
     * Render a message item or date separator
     *
     * @param {Object} param0 - FlatList renderItem params
     * @param {Object} param0.item - Message or separator item
     * @param {number} param0.index - Item index
     */
    const renderItem = ({ item, index }) => {
        // Get prepared messages with date separators
        const preparedMessages = prepareMessagesWithDateSeparators();

        // Render date separator
        if (item.type === MESSAGE_TYPES.DATE_SEPARATOR) {
            return renderDateSeparator(item);
        }

        // Render message
        return renderMessage(item, index, preparedMessages);
    };

    /**
     * Render a date separator item
     *
     * @param {Object} item - Date separator item
     */
    const renderDateSeparator = (item) => (
        <View style={styles.dateSeparatorContainer}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>{item.date}</Text>
            <View style={styles.dateSeparatorLine} />
        </View>
    );

    /**
     * Render a message item
     *
     * @param {Object} item - Message item
     * @param {number} index - Item index
     * @param {Array} preparedMessages - All messages with separators
     */
    const renderMessage = (item, index, preparedMessages) => {
        const isCurrentUser = item.sender && item.sender.isCurrentUser;

        // Find the previous message (that's not a date separator)
        let prevMessageIndex = index - 1;
        let prevMessage = null;

        while (prevMessageIndex >= 0) {
            if (preparedMessages[prevMessageIndex].type === MESSAGE_TYPES.MESSAGE) {
                prevMessage = preparedMessages[prevMessageIndex];
                break;
            }
            prevMessageIndex--;
        }

        const isConsecutive =
            prevMessage &&
            prevMessage.sender?.isCurrentUser === isCurrentUser &&
            !shouldShowDateSeparator(item, prevMessage);

        const messageTime = new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        return (
            <View
                style={[
                    styles.messageContainer,
                    isCurrentUser
                        ? styles.currentUserMessage
                        : styles.otherUserMessage,
                    isConsecutive && styles.consecutiveMessage,
                ]}
            >
                <View
                    style={[
                        styles.messageBubble,
                        isCurrentUser
                            ? styles.currentUserBubble
                            : styles.otherUserBubble,
                        item.pending && styles.pendingMessage,
                        item.failed && styles.failedMessage,
                    ]}
                >
                    <Text
                        style={[
                            styles.messageText,
                            isCurrentUser
                                ? styles.currentUserText
                                : styles.otherUserText,
                        ]}
                    >
                        {item.content}
                    </Text>

                    <View style={styles.messageFooter}>
                        {item.pending && (
                            <Ionicons
                                name="time-outline"
                                size={12}
                                color={
                                    isCurrentUser
                                        ? withOpacity(
                                              theme.colors.onPrimary,
                                              0.7
                                          )
                                        : theme.colors.textSecondary
                                }
                            />
                        )}
                        {item.failed && (
                            <Ionicons
                                name="alert-circle-outline"
                                size={12}
                                color={theme.colors.error}
                            />
                        )}
                        <Text
                            style={[
                                styles.messageTime,
                                isCurrentUser
                                    ? styles.currentUserTime
                                    : styles.otherUserTime,
                            ]}
                        >
                            {messageTime}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    /**
     * Render the empty state when no messages exist
     */
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons
                name="chatbubble-ellipses-outline"
                size={64}
                color={theme.colors.divider}
            />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
    );

    /**
     * Render the message input area
     */
    const renderMessageInput = () => (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.colors.placeholder}
                    multiline
                    maxHeight={80}
                />
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        !inputText.trim() || isSending
                            ? styles.disabledButton
                            : {},
                    ]}
                    onPress={sendMessage}
                    disabled={!inputText.trim() || isSending}
                >
                    {isSending ? (
                        <ActivityIndicator
                            size="small"
                            color={theme.colors.onPrimary}
                        />
                    ) : (
                        <Ionicons
                            name="send"
                            size={20}
                            color={theme.colors.onPrimary}
                        />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );

    // =====================================================================
    // MENU OPTIONS
    // =====================================================================
    const menuOptions = [
        {
            label: "View Profile",
            icon: "person-outline",
            onPress: () => {
                if (otherPet && otherPet._id) {
                    navigation.navigate("PetProfile", {
                        petId: otherPet._id,
                    });
                }
            },
        },
        {
            label: "Unmatch",
            icon: "close-circle-outline",
            onPress: handleUnmatch,
        },
    ];

    // =====================================================================
    // MAIN RENDER
    // =====================================================================

    // Show loading state
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // Prepare messages with date separators
    const preparedMessages = prepareMessagesWithDateSeparators();

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.chatContainer}>
                {messages.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={preparedMessages}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.messagesContainer}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        onContentSizeChange={() => scrollToBottom(false)}
                        onLayout={() => scrollToBottom(false)}
                    />
                )}
            </View>

            {renderMessageInput()}

            <MenuBottomSheet
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                options={menuOptions}
                title="Chat Options"
            />
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
    chatContainer: {
        flex: 1,
        width: "100%",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    backButton: {
        marginLeft: theme.spacing.sm,
        padding: theme.spacing.xs,
    },
    headerButton: {
        marginRight: theme.spacing.sm,
        padding: theme.spacing.xs,
    },
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    headerTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 80,
    },
    emptyText: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.lg,
    },
    emptySubtext: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textDisabled,
        marginTop: theme.spacing.sm,
    },
    messagesContainer: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        paddingBottom: theme.spacing.xxl * 2, // Extra padding at bottom to ensure messages aren't hidden
    },
    messageContainer: {
        marginVertical: theme.spacing.xs,
        maxWidth: "80%",
    },
    consecutiveMessage: {
        marginTop: 2,
    },
    currentUserMessage: {
        alignSelf: "flex-end",
    },
    otherUserMessage: {
        alignSelf: "flex-start",
    },
    messageBubble: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        minWidth: 80,
    },
    currentUserBubble: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: theme.borderRadius.xs,
    },
    otherUserBubble: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderBottomLeftRadius: theme.borderRadius.xs,
    },
    messageText: {
        fontSize: theme.typography.fontSize.md,
        lineHeight:
            theme.typography.lineHeight.normal * theme.typography.fontSize.md,
    },
    currentUserText: {
        color: theme.colors.onPrimary,
    },
    otherUserText: {
        color: theme.colors.textPrimary,
    },
    pendingMessage: {
        opacity: 0.7,
    },
    failedMessage: {
        backgroundColor: withOpacity(theme.colors.error, 0.1),
        borderColor: withOpacity(theme.colors.error, 0.3),
    },
    messageFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: theme.spacing.xs,
        gap: 4,
    },
    messageTime: {
        fontSize: theme.typography.fontSize.xs,
        alignSelf: "flex-end",
    },
    currentUserTime: {
        color: withOpacity(theme.colors.onPrimary, 0.7),
    },
    otherUserTime: {
        color: theme.colors.textSecondary,
    },
    inputContainer: {
        flexDirection: "row",
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        alignItems: "flex-end",
    },
    input: {
        flex: 1,
        backgroundColor: theme.colors.backgroundVariant,
        borderRadius: theme.borderRadius.xl,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        paddingTop: theme.spacing.md,
        fontSize: theme.typography.fontSize.md,
        maxHeight: 80,
        marginRight: theme.spacing.md,
        color: theme.colors.textPrimary,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    disabledButton: {
        backgroundColor: theme.colors.buttonDisabled,
    },
    // Date separator styles
    dateSeparatorContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
    },
    dateSeparatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.divider,
    },
    dateSeparatorText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginHorizontal: theme.spacing.md,
        fontWeight: theme.typography.fontWeight.medium,
    },
});

export default ChatScreen;
